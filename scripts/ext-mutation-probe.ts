/**
 * Extension DOM Mutation Probe（扩展篡改防回归探针）
 * --------------------------------------------------
 * 防回归测试：验证「浏览器扩展在 hydration 前篡改 DOM」的修复（<html>/<body> 根元素上的
 * suppressHydrationWarning）是否持续生效，且覆盖边界未被破坏。详见 docs/hydration.md。
 *
 * 背景：app/[locale]/layout.tsx 与 app/admin/layout.tsx 的根元素带有 suppressHydrationWarning，
 * 用于压制沉浸式翻译等扩展在 hydration 前向根元素注入属性/class 导致的误报。
 *
 * 本探针用无头 Chrome（CDP，零依赖）模拟扩展在 document_start 做各类篡改，逐场景断言：
 *   - 覆盖场景（expectWarning=false）：<html>/<body> 属性与 class 注入 → 应无 hydration 警告
 *   - 哨兵场景（expectWarning=true）：内部元素 <main> 注入 class → 应仍有 hydration 警告
 *     （证明检测管道真实有效，且覆盖范围没有意外扩大——若有人给内部组件也加了
 *       suppressHydrationWarning，哨兵会失败）
 *
 * 与临时探针相比，正式版固化了几条关键教训：
 *   1. 场景隔离：每个场景用 Page.addScriptToEvaluateOnNewDocument 注入，测完立即
 *      removeScriptToEvaluateOnNewDocument —— 防止上一场景的注入脚本污染下一场景。
 *   2. 注入确认：页面加载后验证篡改确实生效（verify 返回 "ok"）。注入未生效时报告探针
 *      自身错误（退出码 2），而不是误判为「无警告」的假阳性。
 *   3. 等待目标元素：document_start 时 <html> 可能尚不存在、<body>/<main> 由解析器逐步
 *      创建，注入脚本用 MutationObserver 等待目标元素出现后再篡改。
 *
 * 用法（dev server 需运行）：
 *   pnpm check:ext-probe
 *   npx tsx scripts/ext-mutation-probe.ts --base http://localhost:3100 --json
 *   npx tsx scripts/ext-mutation-probe.ts --only main-class   # 只跑哨兵场景
 *
 * 参数：
 *   --base <url>   站点基地址，默认 http://localhost:3100
 *   --urls <list>  附加 URL（逗号分隔，相对路径自动拼 base）。默认探测 /zh、/en、/admin/login
 *                  （同时覆盖前台两个 locale 与后台布局）
 *   --only <ids>   只运行指定场景（逗号分隔），如 --only html-attr,body-class
 *   --wait <ms>    每个页面等待加载完成（readyState=complete）的最大毫秒数，
 *                  水合额外固定缓冲 1.2s，默认 4000
 *   --port <n>     Chrome 调试端口，默认 9340
 *   --json         以 JSON 输出（供 CI 解析）
 *
 * 退出码：0 = 全部符合预期；1 = 有场景不符合预期（防回归失败）；
 *         2 = 探针自身错误（Chrome 启动失败 / 注入未生效）
 */

import { spawn, type ChildProcess } from "child_process";

// ---------- 参数解析 ----------
const args = process.argv.slice(2);
const getArg = (name: string, def?: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = (getArg("--base") ?? "http://localhost:3100").replace(/\/$/, "");
const EXTRA_URLS = (getArg("--urls") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((u) => (u.startsWith("http") ? u : `${BASE}${u.startsWith("/") ? "" : "/"}${u}`));
const ONLY_IDS = (getArg("--only") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PAGE_WAIT_MS = Number(getArg("--wait") ?? "4000");
const DEBUG_PORT = Number(getArg("--port") ?? "9340");
const AS_JSON = args.includes("--json");
const CHROME_BIN = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";

// 默认探测 URL：前台两个 locale + 后台登录页（同时覆盖 storefront 与 admin 两个布局）
const DEFAULT_URLS = ["/zh", "/en", "/admin/login"].map((u) => `${BASE}${u}`);

// ---------- 场景定义 ----------
type Scenario = {
  id: string;
  label: string;
  /** 注入脚本：document_start 执行，等待目标元素出现后完成篡改 */
  inject: string;
  /** 页面加载后验证注入是否生效，返回 "ok" | "skip"（目标元素不存在）| "missing"（注入未生效） */
  verify: string;
  /** false = 覆盖场景（期望无警告）；true = 哨兵场景（期望有警告） */
  expectWarning: boolean;
};

// 通用注入包装：document_start 注册，MutationObserver 等待目标元素出现后执行篡改。
// selector 为 null 时目标为 document.documentElement（<html>）。
function injector(selector: string | null, mutation: string): string {
  return `(function(){
    const apply = () => { ${mutation} };
    const find = () => ${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document.documentElement"};
    if (find()) { apply(); return; }
    const obs = new MutationObserver((m, o) => { if (find()) { apply(); o.disconnect(); } });
    obs.observe(document, { childList: true, subtree: true });
  })();`;
}

const SCENARIOS: Scenario[] = [
  {
    id: "html-attr",
    label: "<html> 注入属性（沉浸式翻译）",
    inject: injector(null, `document.documentElement.setAttribute("data-probe-html-attr", "1")`),
    verify: `document.documentElement.hasAttribute("data-probe-html-attr") ? "ok" : "missing"`,
    expectWarning: false,
  },
  {
    id: "html-class",
    label: "<html> 注入 class（暗黑模式类扩展）",
    inject: injector(null, `document.documentElement.classList.add("probe-ext-html-class")`),
    verify: `document.documentElement.classList.contains("probe-ext-html-class") ? "ok" : "missing"`,
    expectWarning: false,
  },
  {
    id: "body-attr",
    label: "<body> 注入属性",
    inject: injector("body", `document.body.setAttribute("data-probe-body-attr", "1")`),
    verify: `document.body && document.body.hasAttribute("data-probe-body-attr") ? "ok" : "missing"`,
    expectWarning: false,
  },
  {
    id: "body-class",
    label: "<body> 注入 class",
    inject: injector("body", `document.body.classList.add("probe-ext-body-class")`),
    verify: `document.body && document.body.classList.contains("probe-ext-body-class") ? "ok" : "missing"`,
    expectWarning: false,
  },
  {
    id: "main-class",
    label: "<main> 注入 class（哨兵：应触发警告）",
    // 时序假设：MutationObserver 在 <main> 进入 DOM 的微任务中触发，需赶在 React
    // 对 main 子树做属性比对之前完成注入。本地实测稳定，但若未来出现偶发失败，
    // 先排查是否因注入晚于水合导致（而非 suppress 被误加）。
    inject: injector("main", `document.querySelector("main").classList.add("probe-ext-main-class")`),
    verify: `(function(){ const m = document.querySelector("main"); if (!m) return "skip"; return m.classList.contains("probe-ext-main-class") ? "ok" : "missing"; })()`,
    expectWarning: true,
  },
];

const scenarios = ONLY_IDS.length
  ? SCENARIOS.filter((s) => ONLY_IDS.includes(s.id))
  : SCENARIOS;
if (scenarios.length === 0) {
  console.error(`--only 未匹配任何场景。可用：${SCENARIOS.map((s) => s.id).join(", ")}`);
  process.exit(2);
}
const urls = [...new Set([...DEFAULT_URLS, ...EXTRA_URLS])];

// ---------- CDP 客户端 ----------
const HYDRATION_RE = /hydrat|did not match|didn't match/i;

type CaseResult = {
  url: string;
  scenario: string;
  status: "pass" | "fail" | "skip" | "error";
  warnings: string[];
  otherErrors: string[];
  detail: string;
};

async function runProbe(): Promise<{ results: CaseResult[]; chromeError?: string }> {
  // 防并行污染：若调试端口已被占用（可能是另一个探针实例或残留 Chrome），
  // 直接报错而不是连到别人的 Chrome —— 静默的错误结果比明确的失败更危险。
  try {
    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const info: any = await res.json().catch(() => ({}));
      return {
        results: [],
        chromeError: `调试端口 ${DEBUG_PORT} 已被占用（${info.Browser ?? "其他进程"}）。` +
          `可能另一个探针实例正在运行，或上次运行残留了 Chrome 进程。` +
          `请用 --port 换一个端口，或清理残留进程后重试。`,
      };
    }
  } catch {
    /* 端口空闲，继续 */
  }

  // 启动无头 Chrome（user-data-dir 唯一化，避免并行实例间的配置文件锁冲突）
  const chrome: ChildProcess = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--no-sandbox",
      "--disable-gpu",
      "--disable-extensions",
      "--window-size=1280,900",
      `--user-data-dir=/tmp/chrome-ext-probe-${process.pid}`,
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

    // 当前 (URL × 场景) 的错误收集
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

    const results: CaseResult[] = [];
    const timeout = Math.max(PAGE_WAIT_MS, 2000);

    for (const url of urls) {
      for (const sc of scenarios) {
        hydrationWarnings.length = 0;
        otherErrors.length = 0;
        currentUrl = url;

        // 1) 注册注入脚本（作用于下一次导航的新文档）
        const addRes = await send("Page.addScriptToEvaluateOnNewDocument", {
          source: sc.inject,
        });
        const identifier = addRes?.identifier;

        // 2) 导航
        await send("Page.navigate", { url });

        // 3) 等页面加载完成（同时校验 location.href 已切换，避免读到导航前旧文档的 complete）
        let ready = false;
        for (let i = 0; i < Math.ceil(timeout / 250); i++) {
          const r = await send("Runtime.evaluate", {
            expression: `location.href === ${JSON.stringify(url)} ? document.readyState : "loading"`,
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

        // 4) 验证注入是否生效
        const v = await send("Runtime.evaluate", {
          expression: sc.verify,
          returnByValue: true,
        });
        const injected = v?.result?.value as string | undefined;

        // 5) 场景隔离：移除注入脚本，防止污染下一场景
        if (identifier != null) {
          await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
        }

        // 6) 断言
        let result: CaseResult;
        if (injected === "skip") {
          result = {
            url,
            scenario: sc.id,
            status: "skip",
            warnings: [],
            otherErrors: [],
            detail: "页面无目标元素，跳过",
          };
        } else if (injected !== "ok") {
          result = {
            url,
            scenario: sc.id,
            status: "error",
            warnings: [...hydrationWarnings],
            otherErrors: [...otherErrors],
            detail: "注入未生效（探针自检失败，结果不可信）",
          };
        } else if (sc.expectWarning) {
          const ok = hydrationWarnings.length > 0;
          result = {
            url,
            scenario: sc.id,
            status: ok ? "pass" : "fail",
            warnings: [...hydrationWarnings],
            otherErrors: [...otherErrors],
            detail: ok
              ? "检测到预期警告（哨兵有效）"
              : "未检测到警告：检测管道失效，或覆盖范围意外扩大（内部组件被加了 suppress？）",
          };
        } else {
          const ok = hydrationWarnings.length === 0;
          result = {
            url,
            scenario: sc.id,
            status: ok ? "pass" : "fail",
            warnings: [...hydrationWarnings],
            otherErrors: [...otherErrors],
            detail: ok
              ? "无警告（suppress 生效）"
              : `出现 ${hydrationWarnings.length} 条 hydration 警告：suppress 被删除或失效？`,
          };
        }
        results.push(result);
      }
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
function renderHuman(results: CaseResult[], chromeError?: string) {
  const useColor = !!process.stdout.isTTY;
  const c = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
  const green = (s: string) => c("32", s);
  const red = (s: string) => c("31", s);
  const yellow = (s: string) => c("33", s);
  const dim = (s: string) => c("2", s);

  console.log("\n🧪 Extension DOM Mutation Probe（防回归）");
  console.log(dim(`base: ${BASE}    urls: ${urls.length}    scenarios: ${scenarios.length}\n`));

  if (chromeError) {
    console.log(red(`✗ ${chromeError}`));
    return;
  }

  for (const sc of scenarios) {
    const scResults = results.filter((r) => r.scenario === sc.id);
    const mark = sc.expectWarning ? "（哨兵·期望警告）" : "（覆盖·期望无警告）";
    console.log(`[${sc.id}] ${sc.label} ${dim(mark)}`);
    for (const r of scResults) {
      const path = r.url.replace(BASE, "");
      if (r.status === "pass") {
        const extra = r.otherErrors.length ? `（${r.otherErrors.length} 条其他 console error）` : "";
        console.log(`  ${green("✓")} ${path} ${dim(r.detail)}${dim(extra)}`);
      } else if (r.status === "skip") {
        console.log(`  ${yellow("·")} ${path} ${dim(`SKIP — ${r.detail}`)}`);
      } else if (r.status === "error") {
        console.log(`  ${red("✗")} ${path} ${red(r.detail)}`);
      } else {
        console.log(`  ${red("✗")} ${path} ${red(r.detail)}`);
        for (const w of r.warnings.slice(0, 2)) {
          console.log(dim(`      ${w.replace(/\n/g, " ").slice(0, 160)}`));
        }
      }
    }
    console.log("");
  }

  const count = (s: string) => results.filter((r) => r.status === s).length;
  const pass = count("pass");
  const fail = count("fail");
  const skip = count("skip");
  const err = count("error");
  console.log(
    `汇总：${results.length} 用例 — ${green(`${pass} 通过`)} / ${red(`${fail} 失败`)} / ${yellow(`${skip} 跳过`)} / ${red(`${err} 错误`)}`
  );
  if (fail === 0 && err === 0) {
    console.log(green("✅ 覆盖边界与检测管道均符合预期，无回归"));
  } else {
    console.log(red("❌ 存在防回归失败，请检查对应布局的 suppressHydrationWarning 与 docs/hydration.md"));
  }
}

// ---------- 主流程 ----------
async function main() {
  const { results, chromeError } = await runProbe();

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          base: BASE,
          urls,
          scenarios: scenarios.map((s) => ({ id: s.id, expectWarning: s.expectWarning })),
          results,
          summary: {
            pass: results.filter((r) => r.status === "pass").length,
            fail: results.filter((r) => r.status === "fail").length,
            skip: results.filter((r) => r.status === "skip").length,
            error: results.filter((r) => r.status === "error").length,
          },
          error: chromeError ?? null,
        },
        null,
        2
      )
    );
  } else {
    renderHuman(results, chromeError);
  }

  const hasScriptError = !!chromeError || results.some((r) => r.status === "error");
  const hasFailures = results.some((r) => r.status === "fail");
  process.exit(hasScriptError ? 2 : hasFailures ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(2);
});
