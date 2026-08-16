# Hydration 健康检查与 `suppressHydrationWarning` 说明

> 本文档解释项目里 `<html>` / `<body>` 上的 `suppressHydrationWarning` 是什么、为什么存在、
> 覆盖范围有多大，以及配套的自动化检查脚本。**新增页面或改动布局前请先读一遍。**

---

## 1. 背景：为什么会报 hydration 警告

React 在客户端「水合（hydration）」时，会把服务端渲染的 HTML 与客户端虚拟 DOM 逐元素比对。
如果两者不一致（属性、文本内容、元素树），React 会向控制台报错：

> A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.

常见**真实**原因（必须修代码）：

- 客户端组件里用 `if (typeof window !== 'undefined')` 做分支
- 渲染时调用 `Date.now()` / `Math.random()` 等每次结果不同的函数
- 按用户本地时区/语言格式化日期，与服务端不一致
- 无效的 HTML 标签嵌套

本项目还遇到一类**误报**原因：**浏览器扩展在 hydration 之前篡改了 DOM**。

### 1.1 本项目遇到的具体情况

用户安装「沉浸式翻译（Immersive Translate）」等扩展后，扩展的 content script 会在页面
文档创建阶段（`document_start`）往 `<html>` 根元素注入属性：

```html
<html lang="en" data-immersive-translate-page-theme="light">
```

这些属性**服务端 HTML 里没有、客户端虚拟 DOM 里也没有**，只是扩展临时加在 DOM 上。
React 比对时发现「DOM 上的属性与客户端属性不一致」，于是误报。

### 1.2 实测排查（CDP 探针）

用无头 Chrome 模拟扩展在 hydration 前做各种篡改，验证哪些会触发警告：

| 篡改场景 | 触发警告？ | 是否覆盖 |
|---|---|---|
| `<html>` 注入属性（沉浸式翻译） | ✅ | `suppressHydrationWarning`（html） |
| `<body>` 注入属性 / class（暗黑模式类扩展） | ✅ | `suppressHydrationWarning`（body） |
| `<html>` 注入 class | ✅ | `suppressHydrationWarning`（html） |
| 内部元素（如 `<main>`）注入 class | ✅ | 未覆盖（见 §3） |
| 包裹段落文本 / 插入浮标节点 | ✅ | 未覆盖（真实扩展多在 hydration 后注入，不触发） |
| `<head>` 注入 style | ✅ | 未覆盖（纯样式，不影响功能） |

---

## 2. 修复内容

给两个布局的**根元素**加了 `suppressHydrationWarning`：

| 文件 | 元素 |
|---|---|
| `app/[locale]/layout.tsx` | `<html lang={locale}>` + `<body>` |
| `app/admin/layout.tsx` | `<html lang="zh-CN">` + `<body>` |

`suppressHydrationWarning` 是 React 官方针对「第三方脚本/扩展修改元素属性」的推荐解法
（见 React 文档 hydration 错误页）。它**只跳过该元素自身的属性比对**。

---

## 3. 覆盖边界（重要）

`suppressHydrationWarning` **不是万能开关**：

- ✅ **覆盖**：`<html>` / `<body>` 两个根元素**自身的属性/class 不一致**
- ❌ **不覆盖**：元素内部的文本内容、子元素树结构不一致（如扩展在 hydration 前包裹文本、
  插入节点）——这些警告**照常报出**，不会被压制

为什么不需要给内部元素加？因为扩展在 hydration 前能触及的只有文档创建阶段就存在的根元素
（`<html>`/`<body>`）；内部元素那时尚未渲染，扩展无法在 hydration 前修改它们。真实扩展
（沉浸式翻译等）的 `document_start` 注入基本都作用于根元素，当前覆盖是完整且符合官方建议的。

---

## 4. 自动化检查：`pnpm check:hydration`

`scripts/hydration-check.ts` 用无头 Chrome（CDP，零依赖）逐页加载并捕获 hydration 警告。

```bash
# 完整模式：模拟扩展注入 + 扫描前台全部 locale + 后台公开页（推荐日常使用）
pnpm check:hydration

# 快速模式：不模拟扩展
pnpm check:hydration:quick

# 自定义参数
npx tsx scripts/hydration-check.ts \
  --base http://localhost:3100 \   # 站点地址（dev server 需运行）
  --simulate-ext \                 # 模拟沉浸式翻译等扩展注入
  --urls "/zh/products/xxx,/en/products/xxx" \  # 附加动态路由
  --json                           # CI 友好输出

# 退出码：0 干净 / 1 有 hydration 警告 / 2 脚本错误
```

**自动发现范围**：`app/[locale]` 下的静态路由（跳过 `[slug]` 等动态段、`(group)` 分组）× 全部
locale，加上 `app/admin` 下的公开路由（如 `/admin/login`；认证组 `(panel)` 自动跳过）。

### 验证思路（双向）

1. **正向**：修复后在 `--simulate-ext` 下扫描 → 应全绿
2. **反向**：临时删掉 `suppressHydrationWarning` 再扫描 → 脚本应立即报出对应页面的警告
   （证明脚本真的能发现问题，不是永远全绿的摆设）；测完**务必恢复**

---

## 4.5 防回归：扩展篡改探针 `pnpm check:ext-probe`

`scripts/ext-mutation-probe.ts` 是**防回归测试**：在无头 Chrome 中模拟扩展在 `document_start`
阶段对 DOM 做各类篡改，逐场景断言 `suppressHydrationWarning` 的覆盖边界没有被破坏。

```bash
pnpm check:ext-probe                  # 默认探测 /zh、/en、/admin/login
npx tsx scripts/ext-mutation-probe.ts --base http://localhost:3100 --json
npx tsx scripts/ext-mutation-probe.ts --only main-class   # 只跑哨兵场景
```

**场景与断言**：

| 场景 | 篡改目标 | 期望 | 作用 |
|---|---|---|---|
| `html-attr` | `<html>` 注入属性 | 无警告 | 覆盖场景：验证沉浸式翻译修复仍在 |
| `html-class` | `<html>` 注入 class | 无警告 | 覆盖场景：暗黑模式类扩展 |
| `body-attr` | `<body>` 注入属性 | 无警告 | 覆盖场景 |
| `body-class` | `<body>` 注入 class | 无警告 | 覆盖场景 |
| `main-class` | 内部 `<main>` 注入 class | **有警告** | **哨兵场景**：证明检测管道有效，且覆盖范围没有意外扩大（若有人给内部组件也加了 `suppressHydrationWarning`，此处会失败） |

**退出码**：0 = 全部符合预期；1 = 有场景不符合预期（防回归失败）；2 = 探针自身错误。

**探针的关键机制**（与临时探针的区别）：

1. **场景隔离**——每个场景用 `Page.addScriptToEvaluateOnNewDocument` 注入，测完立即
   `removeScriptToEvaluateOnNewDocument`，防止上一场景的注入脚本污染下一场景。
2. **注入确认**——加载后验证篡改确实生效；注入未生效时报探针自身错误（退出码 2），
   而不是误判为「无警告」的假阳性。
3. **等待目标元素**——`document_start` 时 `<html>` 可能尚不存在、`<main>` 由解析器逐步
   创建，注入脚本用 MutationObserver 等目标出现后再篡改。

> `check:all` = `check:ext-probe` + `check:hydration`，一条命令跑完全部 hydration 相关检查。

---

## 5. ⚠️ 禁止事项

1. **不要删除**现有布局上的 `suppressHydrationWarning`——删了之后装了沉浸式翻译等扩展的
   用户会重新看到误报（这正是最初 bug 的来源）。
2. **不要为了掩盖真实 bug 而到处加** `suppressHydrationWarning`。判断方法：
   - 用 `pnpm check:hydration --simulate-ext` 复现——若只在模拟扩展注入时才报，属扩展误报；
   - 若不开模拟也会报，就是代码问题（见 §1 的真实原因列表），**必须修代码**。
3. **不要把它加在内部组件上**当「静音开关」——那会掩盖真实的文本/结构 mismatch。

---

## 6. 🆘 常见 hydration 报错速查表

> **第一步永远是定位**：先跑 `pnpm check:all`，并对比「带 / 不带 `--simulate-ext`」两种结果——
> 只在模拟扩展注入时才报 → 扩展误报；不开模拟也报 → 代码问题。修完后重跑确认全绿。

| 控制台报错（关键词） | 常见原因 | 处理方式 |
|---|---|---|
| `A tree hydrated but some attributes ... didn't match the client properties` | ① 浏览器扩展在 hydration 前向元素注入属性/class；② 属性值在 SSR 与客户端首次渲染不同（`checked`/`value`/`aria-*` 依赖 `window` 或动态条件） | ① 扩展注入：确认是 `<html>`/`<body>` 根元素（本项目已带 `suppressHydrationWarning`，勿删）；内部元素被注入属罕见，确认为扩展后再在该元素加 `suppressHydrationWarning` ② 代码问题：改用 `defaultChecked`/`defaultValue`，或把动态属性移到 `useEffect` 中设置 |
| `Text content does not match server-rendered HTML. Server: "..." Client: "..."` | 渲染函数直接调用 `Date.now()` / `new Date()` / `Math.random()` / `toLocaleDateString()`（服务端与客户端时区/语言不一致）、`typeof window` 分支 | 两阶段渲染：SSR 输出稳定占位，`useEffect` 中再更新为动态文本；若该文本服务端与客户端本就允许不同，可在元素上加 `suppressHydrationWarning`（注意：加了之后 React 不再补丁该文本） |
| `Expected server HTML to contain a matching <div> in <p>` | 无效 HTML 嵌套（`<p>` 内套 `<div>`、`<button>` 套 `<button>`、`<a>` 套 `<a>` 等），浏览器解析自动「纠正」DOM 导致结构与 React 预期不符 | 修复标记结构（把 `<p>` 换成 `<div>` 等合法包裹）；用 HTML 校验 / lint 在提交前提前发现 |
| `Hydration failed because the initial UI does not match what was rendered on the server`（React 18/19 通用；生产构建伴随 Minified React error #418） | 上述各类差异的总括：SSR 与客户端首次渲染不一致（分支逻辑、环境变量、数据来源不同） | 用 dev overlay / React DevTools 的组件栈定位不匹配组件，按上面对应行处理；**不要**盲目加 `suppressHydrationWarning` |
| `data-immersive-translate-page-theme` 等 `data-immersive-translate-*` 出现在 `<html>` 的 diff 中 | 沉浸式翻译扩展在 `document_start` 向 `<html>` 根元素注入属性（本项目最初 bug，见 §1.1） | 扩展误报，**无需改代码**：`<html>`/`<body>` 已带 `suppressHydrationWarning`，不要删除；用 `pnpm check:ext-probe` 确认覆盖边界完好 |

> `suppressHydrationWarning` 只作用于**它所在的那一个元素**（不级联子元素），且对文本不匹配
> 不再补丁。它是「逃生舱」而非通用修复——结构类错误（第 4 行）永远要修代码。
