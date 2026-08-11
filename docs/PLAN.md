# 拾光 / LUMEN · 独立店商网站实施方案

> 状态：**已确认（Grilling 面试产出）** · 更新日期：2026-08-10
> 目标：开发一个 Shopify 风格的独立店商网站（前台店铺 + 结账流程 + 管理后台）

---

## 1. 决策记录

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | MVP 范围 | **前台店铺 + 结账流程 + 管理后台** |
| 2 | 技术栈 | **Next.js 15（App Router）+ TypeScript + Tailwind CSS**（后台按需引入 shadcn/ui 原语） |
| 3 | 数据层 | **Prisma + SQLite**（本地文件数据库，schema 预留上云切换） |
| 4 | 支付方式 | **模拟支付 + PaymentProvider 接口抽象**（未来可无缝接真实支付） |
| 5 | 界面语言 | **中英双语 i18n**（next-intl，URL 前缀 `/zh` `/en` + 切换器） |
| 6 | 商品类目 | **生活方式买手店**（家居 / 香氛 / 文创 / 配饰 / 餐厨 / 灯饰等混搭） |
| 7 | 设计风格 | **Dawn 极简风**（白底、大留白、细体字、商品图居中、克制微动效） |
| 8 | 图片来源 | **外链为主 + 本地兜底**（Unsplash 外链，加载失败降级本地占位图） |
| 9 | 认证方式 | **完整用户系统**：后台管理员 + 前台顾客账号，角色 `ADMIN` / `CUSTOMER` |
| 10 | 前台功能 | 首页 / 商品列表 / 商品详情 / 购物车抽屉 / 结账 / 顾客账号 / 收藏夹 / 评分留言 |
| 11 | 后台功能 | 仪表盘（含图表）/ 商品 / 订单 / 分类 / 评论 / 顾客 管理 |
| 12 | 品牌名 | **拾光 / LUMEN** |
| 13 | 部署目标 | **本地运行**（README 附"上云三步走"） |

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────────┐
│  Next.js 15 (App Router) + TypeScript + Tailwind     │
│                                                     │
│  /zh /en  (next-intl 双语路由)                       │
│  ├── 前台 (Storefront)                               │
│  │    首页 / 列表 / 详情 / 购物车 / 结账 / 账号      │
│  ├── /admin  (管理后台, ADMIN 角色守卫)              │
│  │    仪表盘 / 商品 / 订单 / 分类 / 评论 / 顾客      │
│  └── Server Actions + Route Handlers                 │
│        ├── AuthService（注册/登录/会话/角色）        │
│        ├── PaymentProvider（模拟支付接口）           │
│        └── 业务逻辑层（商品/订单/评论/收藏）         │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma Client
             ┌─────────▼─────────┐
             │  SQLite (本地文件)  │  ← 上云时改 datasource 即可
             └───────────────────┘
```

### 关键技术点
- **SEO**：商品/分类页用 RSC 服务端渲染，保证搜索引擎收录
- **购物车**：客户端状态（Cookie/localStorage），Shopify 式轻体验；下单时落库生成订单
- **国际化**：next-intl 管理 `zh` / `en` 两套文案，`[locale]` 路由前缀 + 默认语言重定向
- **支付抽象**：`PaymentProvider` 接口（`charge(order)`），MVP 实现为 `MockPaymentProvider`，未来替换为 Stripe/支付宝等真实实现
- **图片降级**：`next/image` + `onError`，失败时替换为本地生成的占位图组件

---

## 3. 数据模型（Prisma Schema 草案）

```
User           id, email(唯一), passwordHash, name, role(ADMIN/CUSTOMER), createdAt
Session        id, userId, token, expiresAt        # 会话（或 JWT 无状态方案）
Category       id, name(多语言), slug, description, order
Product        id, title(多语言), slug, description(多语言),
               price, compareAtPrice, stock, images(JSON 数组),
               categoryId, featured, active, createdAt
Variant        id, productId, name(颜色/尺码), value, price?, stock
Review         id, productId, userId, rating(1-5), comment, createdAt
WishlistItem   id, userId, productId(唯一组合)
Order          id, orderNumber, userId?, customerName, customerEmail,
               phone, address(省市区/街道/邮编), shippingMethod,
               shippingFee, subtotal, total, status, paymentStatus,
               paymentMethod, createdAt
OrderItem      id, orderId, productId, title, variantInfo, price, quantity
```

### 订单状态机
```
待支付 → 已支付 → 已发货 → 已完成
   └──────→ 已取消（待支付时可取消）
```

---

## 4. 前台页面清单

| 路由 | 页面 | 核心功能 |
|------|------|----------|
| `/` | 首页 | Hero 大图、特色品类入口、新品上架、品牌故事、邮件订阅 |
| `/products` | 商品列表 | 品类筛选、价格筛选、排序、关键词搜索、分页 |
| `/products/[slug]` | 商品详情 | 多图画廊、颜色/尺码变体、数量、加入购物车、收藏、相关推荐、评分留言展示与提交 |
| `/cart` | 购物车（抽屉组件） | 数量增减、删除、金额合计、去结账 |
| `/checkout` | 结账 | 收货信息 → 配送方式 → 模拟支付 → 生成订单 |
| `/order/[id]` | 订单确认页 | 订单详情、状态展示 |
| `/account` | 顾客账号 | 注册 / 登录 / 退出、我的订单列表 |
| `/wishlist` | 收藏夹 | 收藏商品列表、移入购物车、取消收藏 |

---

## 5. 后台页面清单（`/admin`，仅 ADMIN 可访问）

| 路由 | 页面 | 核心功能 |
|------|------|----------|
| `/admin` | 仪表盘 | 今日/累计销售额、订单数、热销商品 TOP、最近订单、近 30 天销售图表 |
| `/admin/products` | 商品管理 | 列表、新建、编辑、删除、价格/库存/图片/分类/变体、上架下架 |
| `/admin/orders` | 订单管理 | 订单列表、详情、状态流转、金额明细 |
| `/admin/categories` | 分类管理 | 品类增删改、排序 |
| `/admin/reviews` | 评论管理 | 查看、删除顾客评分留言 |
| `/admin/customers` | 顾客管理 | 注册顾客列表、查看其订单 |

---

## 6. 种子数据计划

- 商品：约 **24 个**，覆盖 6-8 个品类（家居 / 香氛 / 文创 / 配饰 / 餐厨 / 灯饰…）
- 每个商品：多张 Unsplash 图、中英文标题与描述、价格/划线价、库存、部分含变体
- 演示用户：1 个管理员（`admin@lumen.demo`，密码走环境变量）+ 3 个演示顾客
- 演示订单：若干不同状态的订单（含已支付/已发货/已完成），让仪表盘有数据
- 演示评论：部分商品带评分留言
- 全部通过 `prisma/seed.ts` 生成，可重复执行（幂等）

---

## 7. 交付物

- 完整可运行项目（`pnpm dev` / `pnpm build` / `pnpm prisma db push` + seed）
- `README.md`：安装步骤、管理员默认账号、功能清单
- `docs/PLAN.md`：本文档
- `docs/DEPLOY.md`（可选）：上云三步走（改 datasource → 加连接串 → 部署）
- `.env.example`：环境变量模板

---

## 8. 上云三步走（未来）

1. `prisma/schema.prisma` 的 `datasource` 从 `sqlite` 改为 `postgresql`（或 `libsql`）
2. 在 `.env` 配置云数据库连接串（Turso / Neon / Supabase）
3. `pnpm prisma migrate deploy` + 部署到 Vercel / 自有服务器
