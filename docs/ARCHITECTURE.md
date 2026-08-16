# LUMEN 拾光生活馆 — 系统架构报告

> 生成时间：自动分析 | 技术栈：Next.js 16.3 + React 19 + Prisma + SQLite

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 16.3                         │
│                   React 19 + TypeScript                     │
│                     Next-intl (zh/en)                       │
├─────────────────┬───────────────────┬──────────────────────┤
│   Store Front   │    Admin Panel    │    API Endpoints     │
│  /[locale]/*    │   /admin/*        │   /api/paypal/*      │
├─────────────────┴───────────────────┴──────────────────────┤
│                        Server Actions                        │
│     actions/auth.ts  │  actions/store.ts  │  actions/admin.ts│
├─────────────────────────────────────────────────────────────┤
│                    lib/ (Business Logic)                    │
│  auth.ts  │  order.ts  │  payments.ts  │  email.ts  │  ...  │
├─────────────────────────────────────────────────────────────┤
│                 Prisma ORM  +  SQLite                       │
│                    prisma/schema.prisma                     │
└─────────────────────────────────────────────────────────────┘
```

**技术栈：**
- **框架**：Next.js 16.3 (App Router), React 19.2.8
- **数据库**：Prisma ORM + SQLite
- **国际化**：next-intl 4.13.5
- **支付**：PayPal REST API v2 + 模拟支付
- **样式**：Tailwind CSS 4 + 自定义 CSS
- **表单验证**：Zod 4
- **图标**：Lucide React

---

## 二、核心模块

### 2.1 认证模块 (`lib/auth.ts` + `actions/auth.ts`)

```
Session-based Authentication
├── createSession(userId)     → 生成 32-byte token，写入 DB + HttpOnly Cookie
├── getSessionUser()          → 解析 Cookie → 查 Session 表 → 返回 User
├── destroySession()          → 删除 Session + 清除 Cookie
└── requireAdmin()            → 管理后台守卫，非 ADMIN 重定向
```

**Session 生命周期：** 30 天 TTL（可配置 `SESSION_TTL_DAYS`）

### 2.2 订单模块 (`lib/order.ts` + `actions/store.ts`)

```
Checkout Flow (两条支付路径)
├── 模拟支付 (placeOrderAction)
│   ├── buildOrderFromForm()  → 校验 + 以 DB 价格计算 + 库存检查
│   ├── prisma.$transaction() → 原子操作
│   │   ├── 创建 Order (PENDING)
│   │   ├── 模拟支付扣款
│   │   ├── 更新为 PAID
│   │   └── 扣库存 (stock >= quantity 才扣，防超卖)
│   └── 成功后 revalidatePath + redirect
│
└── PayPal 两阶段 (API Routes)
    ├── POST /api/paypal/create-order
    │   ├── buildOrderFromForm() 校验
    │   ├── 创建本地 Order (PENDING, 存 paypalOrderId)
    │   └── 调用 PayPal API → 返回 paypalOrderId
    │
    └── POST /api/paypal/capture-order
        ├── 按 paypalOrderId 查本地订单
        ├── capturePayPalOrder() 捕获资金
        ├── $transaction: updateMany PENDING→PAID + 扣库存
        └── 幂等处理（重复回调返回成功）
```

### 2.3 购物车模块 (`components/cart/cart-context.tsx`)

```
Client-side Cart (Context + localStorage)
├── CartProvider → CartContext
├── CartItem = { productId, slug, title, image, price, quantity, variant? }
├── 持久化：localStorage key="lumen_cart"
├── 状态：items[], isOpen (Drawer), hydrated (防 SSR 水合不匹配)
└── 方法：addItem, removeItem, updateQuantity, clear, openCart, closeCart
```

### 2.4 邮件/通知模块 (`lib/email.ts` + `lib/notifications.ts`)

```
Review Invite Email System
├── getReviewInviteEligibleOrders(userId)
│   ├── status = COMPLETED
│   ├── createdAt <= now - REVIEW_INVITE_DAYS (3天)
│   └── 有未评价商品
├── sendReviewInviteEmail() → 落库 EmailLog（幂等，orderId 唯一约束）
├── runReviewInviteEmailJob() → 扫描所有用户，批量发送
└── 邮件内容：HTML 模板 + 订单号 + 待评价商品数 + 链接
```

### 2.5 Admin 模块 (`actions/admin.ts` + `components/admin/*`)

```
CRUD Operations (全部 requireAdmin)
├── Product: create, update, delete, toggle active/featured
├── Category: create, update, delete
├── Order: 更新状态 (PAID→SHIPPED→COMPLETED, 状态机)
├── Review: 删除
├── EmailLog: 只读
└── Customer: 查看用户列表
```

---

## 三、数据流

### 3.1 用户结账数据流

```
[Client]
  CartDrawer → CheckoutForm (useActionState)
    ↓ FormData
  placeOrderAction / PayPalCheckout
    ↓ buildOrderFromForm()
  [Server] prisma.product.findMany (价格从 DB 取，防前端篡改)
    ↓ 事务
  Order + OrderItem + OrderEvent 写入
    ↓
  paymentProvider.charge() (模拟) / PayPal API
    ↓
  stock decrement (atomic)
    ↓
  revalidatePath + redirect /o order/[id]
```

### 3.2 PayPal 两阶段数据流

```
[Client] → PayPalCheckout.createOrder()
  ↓ fetch /api/paypal/create-order
  [Server] → buildOrderFromForm()
  [Server] → prisma.order.create (PENDING, paypalOrderId=null)
  [Server] → PayPal /v2/checkout/orders → paypalOrderId
  [Server] → update paypalOrderId
  ← { paypalOrderId, localOrderId }
  [Client] → PayPal 弹窗授权
  ↓
  [Client] → PayPalCheckout.onApprove({ orderId })
  ↓ fetch /api/paypal/capture-order
  [Server] → prisma.order.findUnique (by paypalOrderId)
  [Server] → PayPal /v2/checkout/orders/{id}/capture
  [Server] → prisma.$transaction: PENDING→PAID + 扣库存
  ← { localOrderId }
  [Client] → router.push /order/[id]
```

---

## 四、Agent/Tool 调用机制

本项目使用 **Next.js Server Actions** 作为主要服务端逻辑调用机制：

```typescript
"use server" 指令标记的文件/函数 → 可在 Client 组件直接调用
```

| 文件 | 导出的 Server Actions | 用途 |
|------|----------------------|------|
| `actions/auth.ts` | `registerAction`, `loginAction`, `adminLoginAction`, `logoutAction` | 认证 |
| `actions/store.ts` | `placeOrderAction`, `addReviewAction` | 购物/评价 |
| `actions/admin.ts` | `createProductAction`, `updateProductAction`, `deleteProductAction` 等 | 后台管理 |
| `actions/notifications.ts` | `markNotificationsReadAction` | 通知已读 |

**客户端使用方式：**
```tsx
// useActionState (React 19)
const [state, formAction, pending] = useActionState(placeOrderAction, undefined);
<form action={formAction}>...</form>
```

---

## 五、Storage 层

### 5.1 Prisma Schema 核心实体

```
User ──┬── Session (多对多 via userId)
       ├── Review (一对多)
       ├── WishlistItem (一对多)
       ├── Order (一对多)
       └── Notification (一对多)

Product ──┬── Variant (一对多)
          ├── Review (一对多)
          ├── WishlistItem (一对多)
          └── OrderItem (一对多 via join table)

Category ── Product (一对多)

Order ──┬── OrderItem (一对多)
        └── OrderEvent (一对多，状态历史)
```

### 5.2 关键索引

- `Session(token)` — 唯一，快速查找
- `Session(userId)` — 查找用户所有会话
- `Product(categoryId)` — 分类查询
- `Product(featured)` — 首屏精选
- `Review(productId)` — 商品评价
- `Review(userId, productId)` — 唯一约束，防重复评价
- `WishlistItem(userId, productId)` — 唯一约束
- `Notification(userId, read)` — 未读通知
- `EmailLog(orderId)` — 唯一，一单一封

---

## 六、测试

### 6.1 测试框架

- **框架**：Vitest 4.1.10
- **环境**：jsdom (React Testing Library 16.3)
- **配置**：`vitest.config.ts`

### 6.2 测试套件

| 文件 | 测试数 | 覆盖范围 |
|------|--------|----------|
| `tests/utils.test.ts` | 24 | 工具函数：slugify, parseImages, randomOrderNumber 等 |
| `tests/format.test.ts` | 9 | 格式化函数：formatPrice, formatDate |
| `tests/validation.test.ts` | 35 | Zod 验证模式：所有表单 schema |
| `tests/constants.test.ts` | 14 | 常量定义：运费、支付方式、状态标签 |
| `tests/order.test.ts` | 17 | 订单构建逻辑：buildOrderFromForm |
| `tests/order-timeline.test.ts` | 23 | 物流时间轴：stageStatus, buildTimeline |
| `tests/payments.test.ts` | 6 | 支付提供者：MockPaymentProvider |
| `tests/cart-context.test.tsx` | 9 | 购物车 Context：addItem, removeItem, clear 等 |
| `tests/actions.test.ts` | 17 | Server Actions 验证与认证流程 |

**总计**：9 个测试文件，154 个测试用例，全部通过 ✅

### 6.3 运行测试

```bash
# 运行所有测试
pnpm test:run

# 监听模式（开发时）
pnpm test

# 带 UI 界面
pnpm test:ui

# 覆盖率报告
pnpm test:coverage
```

### 6.4 测试命令

已在 `package.json` 中添加：
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```


---

## 七、最重要的入口文件

| 文件 | 作用 |
|------|------|
| `app/proxy.ts` | **i18n 中间件**，根路径重定向到 `/zh` 或 `/en` |
| `app/[locale]/layout.tsx` | **根布局**，包裹 CartProvider + Header + Footer |
| `middleware.ts` | 不存在（i18n 走 proxy.ts） |
| `next.config.ts` | 集成 next-intl 插件 + 图片域名白名单 |
| `lib/db.ts` | **Prisma 单例**，开发环境带日志 |
| `i18n/routing.ts` | 国际化路由配置（`zh`, `en`，always 前缀） |
| `prisma/seed.ts` | **演示数据**，8 类 32+ 商品 + 管理员账号 |

---

---

## 九、Vercel 部署

### 9.1 部署配置

| 文件 | 说明 |
|------|------|
| `vercel.json` | Vercel 构建和运行时配置 |
| `prisma/schema.postgresql.prisma` | 生产环境 PostgreSQL Schema |
| `.env.example` | 环境变量模板（含生产变量说明） |
| `docs/DEPLOYMENT.md` | 详细部署指南 |

### 9.2 环境变量（生产环境）

**必需：**
- `DATABASE_URL` — PostgreSQL 连接字符串（Vercel Postgres / Neon / Turso）

**可选：**
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — PayPal 支付
- `NEXT_PUBLIC_SITE_URL` — 邮件链接中的站点 URL

### 9.3 部署步骤

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署预览环境
vercel

# 4. 部署生产环境
vercel --prod
```

### 9.4 GitHub Actions CI/CD

| 工作流 | 触发条件 | 说明 |
|--------|----------|------|
| `ci.yml` | push/PR | 类型检查、Lint、单元测试、构建 |
| `vercel-preview.yml` | push to develop | 自动部署预览环境 |
| `vercel-production.yml` | push to main | 自动部署生产环境 |

## 八、架构亮点与风险

### ✅ 亮点
1. **事务性下单**：订单+支付+扣库存在同一事务，防超卖
2. **价格防篡改**：一律从 DB 取价，前端只传 productId
3. **PayPal 幂等**：两阶段中间态 PENDING + updateMany 防重复捕获
4. **邮件幂等**：orderId 唯一约束 + try/catch P2002
5. **i18n 中间件**：proxy.ts 统一处理语言前缀，无需 middleware.ts

### ⚠️ 风险/待改进
1. ~~**无测试覆盖**~~ ✅ **已解决**：154 个测试覆盖核心业务逻辑
2. **模拟支付**：生产环境需替换为真实支付提供商
3. **SQLite 单文件**：并发写入有瓶颈，生产应换 PostgreSQL
4. **无缓存层**：所有查询直击 DB，高并发场景需加 Redis
5. **邮件未真实发送**：仅落库 EmailLog，需接入 SMTP/SendGrid
