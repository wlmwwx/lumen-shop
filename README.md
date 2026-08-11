# LUMEN · 拾光生活馆

Shopify 风格的独立店商网站（Demo）。中英双语 · 前台店铺 + 结账流程 + 管理后台，基于 **Next.js 16 + TypeScript + Tailwind CSS + Prisma + SQLite**。

## ✨ 功能一览

### 前台（Storefront）
- **首页**：Hero 大图、品类入口、本周精选、新品上架、品牌故事、邮件订阅
- **商品列表**：分类筛选、价格区间、排序（推荐/最新/价格）、关键词搜索、分页
- **商品详情**：多图画廊、颜色/尺码变体、数量选择、加入购物车、立即购买、收藏、评分留言、相关推荐
- **购物车**：侧滑抽屉、数量增减、免邮进度条
- **结账**：收货信息 → 配送方式（标准/次日达/自提）→ 模拟支付 → 订单确认页
- **顾客账号**：注册 / 登录 / 退出 / 我的订单
- **收藏夹**：登录后可收藏/移除/加购
- **国际化**：中 / 英双语切换（`/zh` `/en`）

### 后台（/admin，仅管理员）
- **仪表盘**：今日/累计销售额、订单数、近 30 天销售折线图、热销商品 TOP5、最近订单
- **商品管理**：新建 / 编辑（含变体编辑器）/ 删除 / 上架下架 / 库存
- **订单管理**：列表筛选、详情、状态流转（待支付→已支付→已发货→已完成 / 取消）
- **分类管理**：增删改
- **评论管理**：查看 / 删除顾客评分留言
- **顾客管理**：注册顾客、消费额、订单数

> 支付为**模拟支付**，已抽象为 `PaymentProvider` 接口（`lib/payments.ts`），未来可无缝接入 Stripe / 支付宝 / 微信支付。

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库并生成演示数据（24 商品 / 8 分类 / 演示订单与评论）
pnpm db:push
pnpm db:seed

# 3. 启动开发服务器
pnpm dev
# 打开 http://localhost:3000 （自动重定向到 /zh）
```

生产构建：

```bash
pnpm build && pnpm start
```

## 🔑 演示账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | `admin@lumen.demo` | `admin123` |
| 顾客 | `lin@example.com` | `customer123` |
| 顾客 | `chen@example.com` | `customer123` |

> 管理员账号密码来自 `.env`（`ADMIN_EMAIL` / `ADMIN_PASSWORD`），正式使用前请修改。

## 📁 目录结构

```
app/
  [locale]/        # 前台（中英双语路由）
    products/      # 商品列表 / 详情
    checkout/      # 结账
    order/[id]/    # 订单确认
    account/       # 顾客账号
    wishlist/      # 收藏夹
  admin/           # 管理后台
    (panel)/       # 仪表盘 / 商品 / 订单 / 分类 / 评论 / 顾客
actions/           # Server Actions（认证 / 下单 / 评论 / 后台 CRUD）
components/
  store/           # 前台组件
  admin/           # 后台组件
  cart/            # 购物车状态
i18n/              # next-intl 路由与配置
messages/          # zh / en 文案
prisma/
  schema.prisma    # 数据模型
  seed.ts          # 演示数据
lib/               # db / auth / payments / 校验 / 工具
```

## 🗄️ 数据模型

`User`（角色 ADMIN/CUSTOMER）· `Session` · `Category` · `Product` · `Variant` · `Review` · `WishlistItem` · `Order` / `OrderItem`（含状态机：待支付→已支付→已发货→已完成 / 已取消）

## ☁️ 上云三步走

当前使用本地 SQLite（`prisma/dev.db`）。部署到云端（如 Vercel）时：

1. `prisma/schema.prisma` 的 `datasource` 从 `sqlite` 改为 `postgresql`（或 `libsql`）
2. 在 `.env` 配置云数据库连接串（Turso / Neon / Supabase 等）
3. `pnpm prisma migrate deploy` 后部署

## 🧰 技术栈

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Prisma 6 + SQLite · next-intl · bcryptjs · zod · recharts · lucide-react
