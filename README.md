# LUMEN · 拾光生活馆

Shopify 风格的独立店商网站（Demo）。中英双语 · 前台店铺 + 结账流程 + 管理后台，基于 **Next.js 16 + TypeScript + Tailwind CSS + Prisma + SQLite**。

## ✨ 功能一览

### 前台（Storefront）
- **首页**：Hero 大图、品类入口、本周精选、新品上架、品牌故事、邮件订阅
- **商品列表**：分类筛选、价格区间、排序（推荐/最新/价格）、关键词搜索、分页
- **商品详情**：多图画廊、颜色/尺码变体、数量选择、加入购物车、立即购买、收藏、评分留言、相关推荐
- **购物车**：侧滑抽屉、数量增减、免邮进度条
- **结账**：收货信息 → 配送方式（标准/次日达/自提）→ 支付（模拟支付 + **PayPal 智能按钮**）→ 订单确认页
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

> 支付为**模拟支付** + **PayPal**：模拟支付抽象为 `PaymentProvider` 接口（`lib/payments.ts`）；
> PayPal 走官方两阶段流程（创建订单 → 弹窗授权 → 捕获，`lib/paypal.ts` + `/api/paypal/*`），
> 店价 CNY 按**实时汇率**（open.er-api.com → frankfurter.dev 双源，内存缓存 1 小时，
> 见 `lib/fx.ts`）换算为 USD 提交；API 不可用时自动退回 `PAYPAL_CNY_TO_USD_RATE` 固定汇率。
> 未配置 PayPal 凭据时结账页自动隐藏 PayPal 入口，不影响模拟支付。

### 启用 PayPal（可选）

1. 在 [PayPal Developer](https://developer.paypal.com/dashboard/applications/sandbox) 创建 Sandbox App，
   复制 Client ID / Secret 到 `.env`（参考 `.env.example`）：

   ```bash
   PAYPAL_CLIENT_ID="..."
   PAYPAL_CLIENT_SECRET="..."
   NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."   # 与上面 Client ID 相同（公开给浏览器加载按钮）
   PAYPAL_ENV="sandbox"                  # 生产改 "live"
   # 可选：实时汇率 API 不可用时的兜底汇率（默认 0.14）
   PAYPAL_CNY_TO_USD_RATE=0.14
   ```

   > **汇率说明**：默认使用免费实时汇率 API（open.er-api.com 主源 → frankfurter.dev
   > 备源，每日更新，内存缓存 1 小时），无需配置；两源都不可用时才退回
   > `PAYPAL_CNY_TO_USD_RATE` 兜底值，保证支付链路不中断。缓存时长可用
   > `FX_RATE_CACHE_TTL_SECONDS` 覆盖（单位秒）。

2. 重启 dev server 后，结账页「支付方式」出现 PayPal 选项，点击弹窗授权即可完成支付。
3. Sandbox 测试：使用 PayPal 沙箱买家账号（`https://developer.paypal.com/dashboard/accounts/sandbox`）
   完成授权，订单会进入 `已支付` 状态并显示 PayPal 交易号。

#### Webhook（支付状态同步，可选但推荐）

Webhook 用于把 PayPal 侧的**支付成功 / 退款**事件同步到后台订单列表
（显示 `已捕获` / `已退款` / `部分退款` 等徽标），覆盖主流程之外的异常路径
（如捕获 API 事务失败但资金已到账、买家侧退款等）。

1. 在 [PayPal Developer](https://developer.paypal.com/dashboard/applications/sandbox)
   → 你的 App → **Webhooks** → **Add Webhook**，URL 填
   `https://<你的域名>/api/webhooks/paypal`（本地开发可配合 ngrok 等隧道工具），
   订阅 **Payment capture events**（`PAYMENT.CAPTURE.COMPLETED` 等）。
2. 把后台生成的 **Webhook ID** 填入 `.env`：

   ```bash
   PAYPAL_WEBHOOK_ID="..."
   ```

3. 重启 dev server。之后 PayPal 事件会：验签 → 幂等去重（`WebhookEvent` 表）→
   更新订单 `paypalStatus` / `refundId`，后台订单列表与详情页自动展示。
   未配置 `PAYPAL_WEBHOOK_ID` 时，`/api/webhooks/paypal` 返回 503，不影响其他功能。

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

## 🛡️ 开发注意事项

### Hydration 健康检查

大改动后建议跑一遍 hydration 检查（自动扫描前台全部 locale + 后台公开页）：

```bash
pnpm check:all             # 完整检查：扩展篡改探针 + hydration 扫描（推荐）
pnpm check:hydration        # 完整模式：模拟浏览器扩展注入（扫描页面）
pnpm check:hydration:quick  # 快速模式：不模拟扩展
pnpm check:ext-probe        # 扩展篡改防回归探针（验证 suppress 覆盖边界）
```

#### 运行前提（重要）

1. **dev server 必须已启动，且端口为 `3100`**——脚本默认 `--base http://localhost:3100`：

   ```bash
   pnpm dev -p 3100
   ```

   > ⚠️ `pnpm dev` 默认监听 3000 端口，与脚本默认不一致。若 dev server 跑在其他端口，
   > 需显式指定 `--base`（两个脚本都支持）：
   > `pnpm check:hydration --base http://localhost:3000`

2. **需要本机安装 Chrome / Chromium**：脚本用无头 Chrome（CDP）加载页面。默认查找
   `/usr/bin/google-chrome`，可用环境变量覆盖：`CHROME_BIN=/path/to/chrome pnpm check:all`

3. **数据库已初始化**（页面依赖 Prisma 数据渲染）：`pnpm db:push && pnpm db:seed`

4. **勿并行运行检查**：`hydration-check` 与 `ext-probe` 使用不同的 Chrome 调试端口
   （9339 / 9340）互不冲突；但同一脚本的两个实例并行会因端口占用互相污染结果
   （第二个实例会直接报错退出，不会产出错误数据）。

#### CI 集成建议

以下是可直接照做的 GitHub Actions workflow（`ubuntu-latest` 官方镜像自带 Chrome，无需额外安装）：

```yaml
name: hydration-check
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate            # 生成 Prisma Client（无 postinstall 钩子）
      - run: pnpm db:push && pnpm db:seed   # 初始化演示数据
      - name: 启动 dev server（3100）
        run: pnpm dev -p 3100 &
      - name: 等待 dev server 就绪
        run: |
          for i in $(seq 1 60); do
            curl -sf http://localhost:3100/zh && break || sleep 2
          done
      - name: 探针 + hydration 扫描
        run: pnpm check:all
      - name: （可选）生产构建验证
        run: pnpm build
```

要点：

- **失败即标红**：`check:hydration` 退出码 0=干净 / 1=有 hydration 警告 / 2=脚本错误；
  `check:all` 用 `&&` 串联，任一脚本失败都会让 CI 失败。
- **`--json` 模式**适合 CI 上报/解析：`npx tsx scripts/hydration-check.ts --json`。
- 首次 dev server 编译较慢，等待循环给了约 2 分钟余量；超时可增大 `seq` 上限。
- 本地只想快速验证时用 `pnpm check:hydration:quick`（不模拟扩展，跑得快）。

详见 [docs/hydration.md](docs/hydration.md)。

### ⚠️ 关于 `suppressHydrationWarning`

`app/[locale]/layout.tsx` 与 `app/admin/layout.tsx` 的 `<html>` / `<body>` 根元素上带有 `suppressHydrationWarning`，**这是有意为之，请勿删除**：

- **为什么加**：浏览器扩展（如沉浸式翻译、暗黑模式）会在 React hydration 前向根元素注入 `data-immersive-translate-*` 等属性/class，导致服务端 HTML 与客户端不一致的**误报**。
- **覆盖范围**：仅作用于 `<html>`/`<body>` 这两个根元素**自身的属性比对**，不影响子树——真实的文本/结构 mismatch 警告照常报出。
- **❌ 不要滥用**：它不是掩盖真实 bug 的工具。若页面报 hydration 警告，请先用 `pnpm check:hydration --simulate-ext` 确认是否扩展注入导致；若是代码本身的 SSR/客户端不一致（如 `Date.now()`、`typeof window` 分支、本地化日期格式），**必须修代码**，而不是到处加 `suppressHydrationWarning`。
- **🛡️ 防回归**：`pnpm check:ext-probe` 会在无头浏览器中模拟扩展篡改，验证 `<html>`/`<body>` 注入不再误报、内部元素篡改仍会报错（哨兵场景）——改动布局后跑一遍即可确认没破坏覆盖边界。

## 🧰 技术栈

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Prisma 6 + SQLite · next-intl · bcryptjs · zod · recharts · lucide-react
