# Vercel 部署指南

本文档说明如何将 LUMEN 拾光生活馆部署到 Vercel。

---

## 前提条件

1. **Node.js 18+** 和 **pnpm** 已安装
2. **Vercel 账号**（建议使用 GitHub 账号登录 vercel.com）
3. **GitHub 仓库**（部署前需将代码推送到 GitHub）

---

## 快速部署

### 方法一：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 进入项目目录
cd ShopifyDemo

# 部署预览环境
vercel

# 部署生产环境
vercel --prod
```

### 方法二：使用 GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 访问 https://vercel.com/new
3. 选择 "Import Git Repository"
4. 选择你的 GitHub 仓库
5. 配置环境变量（见下文）
6. 点击 "Deploy"

---

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

### 必需变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:pass@host:5432/db` |

### 可选变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `ADMIN_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 管理员密码 | `secure_password` |
| `SESSION_TTL_DAYS` | 会话有效期（天） | `30` |
| `PAYPAL_CLIENT_ID` | PayPal 客户端 ID | `xxx` |
| `PAYPAL_CLIENT_SECRET` | PayPal 密钥 | `xxx` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal 公开客户端 ID | `xxx` |
| `PAYPAL_ENV` | PayPal 环境 | `sandbox` 或 `live` |
| `PAYPAL_CNY_TO_USD_RATE` | 实时汇率 API 不可用时的兜底汇率 | `0.14` |
| `FX_RATE_CACHE_TTL_SECONDS` | 实时汇率缓存时长（秒） | `3600` |
| `NEXT_PUBLIC_SITE_URL` | 生产站点 URL | `https://yourstore.vercel.app` |

---

## 数据库选择

### 推荐：Vercel Postgres

1. 在 Vercel 项目中点击 "Storage" → "Create Database"
2. 选择 "Postgres"
3. 创建后复制连接字符串到 `DATABASE_URL`

### 替代方案

- **Neon** (免费 PostgreSQL): https://neon.tech
- **Turso** (边缘 SQLite): https://turso.tech
- **Supabase**: https://supabase.com

---

## 部署后配置

### 1. 数据库迁移

首次部署后需要运行数据库迁移：

```bash
# 使用 Vercel CLI
vercel env pull .env.local
vercel run prisma migrate deploy
vercel run prisma db seed
```

### 2. 创建管理员账号

```bash
# 设置环境变量后
vercel run tsx prisma/seed.ts
```

### 3. 自定义域名（可选）

1. 在 Vercel 项目设置中添加域名
2. 在你的域名注册商处添加 DNS 记录
3. 更新 `.env.example` 中的 `NEXT_PUBLIC_SITE_URL`

---

## 构建配置

项目使用 `vercel.json` 配置构建流程：

```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "pnpm install",
  "devCommand": "next dev",
  "framework": "nextjs"
}
```

---

## 常见问题

### Q: 部署后页面空白？

检查：
1. `DATABASE_URL` 是否正确配置
2. 是否运行了 `prisma migrate deploy`
3. 查看 Vercel 函数日志排查错误

### Q: 样式/静态资源加载失败？

确保 `next.config.ts` 中的 `images.remotePatterns` 包含你的图片域名。

### Q: PayPal 无法支付？

1. 确认 `PAYPAL_CLIENT_ID` 和 `PAYPAL_CLIENT_SECRET` 已配置
2. 确认 `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 已配置
3. 沙箱环境测试通过后再切换到 `PAYPAL_ENV=live`

### Q: 数据库连接失败？

1. 确认 PostgreSQL 连接字符串格式正确
2. 确认数据库允许你的 Vercel 项目 IP 访问
3. Neon/Turso 等服务可能需要 SSL 配置

---

## 本地生产预览

```bash
# 拉取 Vercel 环境变量
vercel env pull .env.local

# 运行生产构建
pnpm build

# 本地预览
pnpm start
```

---

## 监控和维护

- 使用 Vercel Analytics 监控访问量
- 使用 Vercel Logs 查看运行时日志
- 定期备份数据库
- 关注 Vercel 定价页面了解用量限制

