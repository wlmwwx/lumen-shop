/**
 * Hydration Health Check
 * ----------------------
 * 通用 hydration 健康检查：用无头 Chrome (CDP) 逐页加载站点页面，
 * 捕获 React hydration mismatch 警告。适合在大改动后 / CI 中运行。
 *
 * 用法（在项目根目录）：
 *   npx tsx scripts/hydration-check.ts
 *   npx tsx scripts/hydration-check.ts --base http://localhost:3100 --simulate-ext
 *   npx tsx scripts/hydration-check.ts --urls "/zh/products/demo-lamp,/en/products/demo-lamp" --json
 *
 * 参数：
 *   --base <url>      站点基地址，默认 http://localhost:3100
 *   --simulate-ext    模拟浏览器扩展（沉浸式翻译）在 hydration 前向 <html> 注入属性，
 *                     用于复现"扩展篡改 DOM 导致的水合误报"（app/[locale]/layout.tsx 里
 *                     suppressHydrationWarning 正是为此加的）
 *   --urls <list>     附加 URL（逗号分隔，相对路径自动拼接 base），用于动态路由
 *                     （如带真实 slug/id 的页面）
 *   --wait <ms>       每个页面等待加载完成（readyState=complete）的最大毫秒数，
 *                     水合额外固定缓冲 1.2s，默认 4000
 *   --port <n>        Chrome 调试端口，默认 9339
 *   --json            以 JSON 输出（供 CI 解析）
 *
 * 说明：默认自动扫描 ① app/[locale] 下的商店前台静态路由（全部 locale 展开）与
 * ② app/admin 下的公开路由（如 /admin/login；认证组 (panel) 与动态段自动跳过）。
 * 动态路由（带 slug/id）等请用 --urls 显式附加。
 *
 * 退出码：0 = 无 hydration 警告；1 = 发现 hydration 警告；2 = 脚本自身错误
 */

import { spawn, type ChildProcess } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
const getArg = (name: string, def?: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = (getArg("--base") ?? "http://localhost:3100").replace(/\/$/, "");
const SIMULATE_EXT = args.includes("--simulate-ext");
const EXTRA_URLS = (getArg("--urls") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((u) => (u.startsWith("http") ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`));
const PAGE_WAIT_MS = Number(getArg("--wait") ?? "4000");
const DEBUG_PORT = Number(getArg("--port") ?? "9339");
const AS_JSON = args.includes("--json");
const CHROME_BIN = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";

// ---------- 自动发现静态路由与 locale ----------
function discoverStaticRoutes(dirRoot: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      // 跳过动态段 [slug]/[id] 与路由分组 (group)
      if (entry.name.startsWith("[") || entry.name.startsWith("(")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
      } else if (entry.name === "page.tsx") {
        routes.push(prefix === "" ? "/" : prefix);
      }
    }
  };
  walk(dirRoot, "");
  return routes.length > 0 ? routes : ["/"];
}

function discoverLocales(): string[] {
  const dir = join(process.cwd(), "messages");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

// 组装扫描 URL 列表：
// 1) 商店前台：每个 locale × app/[locale] 下的静态路由
// 2) 后台：app/admin 下的公开路由（无 locale 前缀；(panel) 认证组自动跳过）
// 3) --urls 附加的 URL（最终去重）
const appRoot = join(process.cwd(), "app");
const storefrontRoutes = existsSync(join(appRoot, "[locale]"))
  ? discoverStaticRoutes(join(appRoot, "[locale]"))
  : [];
const adminRoutes = existsSync(join(appRoot, "admin"))
  ? discoverStaticRoutes(join(appRoot, "admin"))
  : [];
const locales = discoverLocales();
const urls: string[] = [];
for (const loc of locales) {
  for (const route of storefrontRoutes) {
    urls.push(`${BASE}/${loc}${route === "/" ? "" : route}`);
  }
}
for (const route of adminRoutes) {
  urls.push(`${BASE}/admin${route === "/" ? "" : route}`);
}
urls.push(...EXTRA_URLS);
// 去重（--urls 可能与自动发现的路由重叠，如 /admin/login）
const uniqueUrls = [...new Set(urls)];
urls.length = 0;
urls.push(...uniqueUrls);

// ---------- CDP 客户端 ----------
const HYDRATION_RE = /hydrat|did not match|didn't match/i;

type PageResult = {
  url: string;
  ok: boolean;
  hydrationWarnings: string[];
  otherErrors: string[];
};

async function scan(): Promise<{ results: PageResult[]; chromeError?: string }> {
  // 启动无头 Chrome
  const chrome: ChildProcess = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--no-sandbox",
      "--disable-gpu",
      "--disable-extensions",
      "--window-size=1280,900",
      "--user-data-dir=/tmp/chrome-hydration-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let ws: WebSocket | undefined;

  try {
    // 等调试端口就绪
    let pageWsUrl = "";
    for (let i = 0; i < 40; i++) {
      try {
        const list: any[] = await (
          await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)
        ).json();
        const page = list.find((t) => t.type === "page" && !t.url.startsWith("devtools://"));
        if (page?.webSocketDebuggerUrl) {
          pageWsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {
        /* retry */
      }
      await sleep(250);
    }
    if (!pageWsUrl) {
      return {
        results: [],
        chromeError: `无法连接 Chrome 调试端口 ${DEBUG_PORT}（${CHROME_BIN} 是否可执行？）`,
      };
    }

    ws = new WebSocket(pageWsUrl);
    await new Promise<void>((resolve, reject) => {
      ws!.onopen = () => resolve();
      ws!.onerror = () => reject(new Error("WebSocket 连接失败"));
    });

    let msgId = 0;
    const pending = new Map<number, (v: any) => void>();

    const settle = (id: number, v: any) => {
      const cb = pending.get(id);
      if (cb) {
        pending.delete(id);
        cb(v);
      }
    };

    // 带超时的 CDP 调用：Chrome 异常时不至于永久挂起
    const send = (method: string, params: any = {}, timeoutMs = 10000) =>
      new Promise<any>((resolve) => {
        const id = ++msgId;
        const timer = setTimeout(() => settle(id, undefined), timeoutMs);
        pending.set(id, (v) => {
          clearTimeout(timer);
          resolve(v);
        });
        try {
          ws!.send(JSON.stringify({ id, method, params }));
        } catch {
          clearTimeout(timer);
          pending.delete(id);
          resolve(undefined);
        }
      });

    // 连接断开时放行所有挂起的调用
    ws.onclose = () => {
      for (const id of [...pending.keys()]) settle(id, undefined);
    };

    // 每个 URL 的错误收集
    let currentUrl = "";
    const hydrationWarnings: string[] = [];
    const otherErrors: string[] = [];

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string);
      if (msg.id && pending.has(msg.id)) settle(msg.id, msg.result);
      if (msg.method === "Runtime.consoleAPICalled") {
        const text = msg.params.args
          .map((a: any) => a.value ?? a.description ?? "")
          .join(" ");
        if (!text || !currentUrl) return;
        if (msg.params.type === "error" || msg.params.type === "warning") {
          if (HYDRATION_RE.test(text)) hydrationWarnings.push(text.slice(0, 600));
          else if (msg.params.type === "error") otherErrors.push(text.slice(0, 300));
        }
      }
      if (msg.method === "Runtime.exceptionThrown") {
        const text = JSON.stringify(msg.params.exceptionDetails?.exception ?? "");
        if (currentUrl && HYDRATION_RE.test(text)) hydrationWarnings.push(text.slice(0, 600));
      }
    };

    await send("Page.enable");
    await send("Runtime.enable");

    // 可选：模拟沉浸式翻译扩展（在文档创建时尽早向 <html> 注入属性）
    if (SIMULATE_EXT) {
      await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `(function(){
          const inject = () => { document.documentElement.setAttribute('data-immersive-translate-page-theme','light'); };
          if (document.documentElement) inject();
          else { new MutationObserver((m, o) => { if (document.documentElement) { inject(); o.disconnect(); } }).observe(document, { childList: true, subtree: true }); }
        })();`,
      });
    }

    const results: PageResult[] = [];
    const timeout = Math.max(PAGE_WAIT_MS, 2000);

    for (const url of urls) {
      hydrationWarnings.length = 0;
      otherErrors.length = 0;
      currentUrl = url;

      await send("Page.navigate", { url });

      // 等页面加载完成
      let ready = false;
      for (let i = 0; i < Math.ceil(timeout / 250); i++) {
        const r = await send("Runtime.evaluate", {
          expression: "document.readyState",
          returnByValue: true,
        });
        if (r?.result?.value === "complete") {
          ready = true;
          break;
        }
        await sleep(250);
      }
      // 额外缓冲，让 React 完成水合
      await sleep(ready ? 1200 : Math.min(2000, timeout));

      results.push({
        url,
        ok: hydrationWarnings.length === 0,
        hydrationWarnings: [...hydrationWarnings],
        otherErrors: [...otherErrors],
      });
    }

    return { results };
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    chrome.kill();
  }
}

// ---------- 输出 ----------
const failed = (r: PageResult) =>
  r.hydrationWarnings.length > 0;

function renderHuman(results: PageResult[], chromeError?: string) {
  const useColor = !!process.stdout.isTTY;
  const c = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
  const green = (s: string) => c("32", s);
  const red = (s: string) => c("31", s);
  const yellow = (s: string) => c("33", s);
  const dim = (s: string) => c("2", s);

  console.log("\n🧪 Hydration Health Check");
  console.log(dim(`base: ${BASE}    simulate-ext: ${SIMULATE_EXT ? "on" : "off"}    pages: ${urls.length}\n`));

  if (chromeError) {
    console.log(red(`✗ ${chromeError}`));
    return;
  }

  for (const r of results) {
    const path = r.url.replace(BASE, "");
    if (r.ok) {
      console.log(`  ${green("✓")} ${path} ${dim(r.otherErrors.length ? `(${r.otherErrors.length} other console errors)` : "")}`);
    } else {
      console.log(`  ${red("✗")} ${path} ${red(`— ${r.hydrationWarnings.length} hydration warning(s)`)}`);
      for (const w of r.hydrationWarnings.slice(0, 2)) {
        console.log(dim(`      ${w.replace(/\n/g, " ").slice(0, 160)}`));
      }
    }
  }

  const bad = results.filter(failed);
  const failedCount = bad.length;
  console.log("");
  if (failedCount === 0) {
    console.log(green(`✅ ${results.length} 个页面全部通过，无 hydration 警告`));
  } else {
    console.log(red(`❌ ${failedCount}/${results.length} 个页面存在 hydration 警告：`));
    bad.forEach((r) => console.log(red(`   - ${r.url}`)));
  }
  // 其他非 hydration 错误（仅提示，不决定退出码）
  const others = results.flatMap((r) => r.otherErrors);
  if (others.length) {
    console.log(yellow(`\nℹ ${others.length} 条非 hydration 的 console error（仅供参考）：`));
    [...new Set(others)].slice(0, 5).forEach((o) => console.log(dim(`   ${o}`)));
  }
}

// ---------- 主流程 ----------
async function main() {
  const { results, chromeError } = await scan();

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          base: BASE,
          simulateExt: SIMULATE_EXT,
          error: chromeError ?? null,
          results,
          failed: chromeError ? null : results.filter(failed).length,
        },
        null,
        2
      )
    );
  } else {
    renderHuman(results, chromeError);
  }

  const hasFailures = chromeError ? true : results.some(failed);
  process.exit(chromeError ? 2 : hasFailures ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
