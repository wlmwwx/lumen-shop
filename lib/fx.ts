/**
 * 实时汇率（服务端专用）：CNY → USD。
 *
 * 汇率来源（按顺序尝试，全部失败时进入降级路径）：
 *   1. open.er-api.com  —— 免费、无需 key、每日更新（2026 年起官方维护的开放端点）
 *      GET https://open.er-api.com/v6/latest/CNY → { rates: { USD } }
 *   2. frankfurter.dev   —— 免费、无需 key、多央行数据（v2）
 *      GET https://api.frankfurter.dev/v2/rate/CNY/USD → { rate }
 *
 * 缓存与降级策略：
 *   - 真实汇率：内存缓存 FX_RATE_CACHE_TTL_SECONDS（默认 3600 = 1 小时）。
 *     免费 API 有限流（open.er-api 高频请求返回 429），务必依赖缓存；两个源均为
 *     每日更新，1 小时缓存已足够「实时」且不会触发限流。
 *   - 源全部失败时（stale-while-error）：优先复用上一次拿到的汇率——哪怕已过期，
 *     也比固定值更接近市场价；完全没有可用缓存时才用 PAYPAL_CNY_TO_USD_RATE
 *     （默认 0.14）固定兜底，保证支付链路不中断。
 *   - 降级值以“fallback”类型缓存，TTL 更短（FX_RATE_FALLBACK_TTL_SECONDS，
 *     默认 300 = 5 分钟），源恢复后能尽快重新拉取真实汇率，而不是钉在降级值上
 *     一整个小时。
 *
 * 注意：serverless 多实例部署时每个实例各自缓存，只影响刷新频率不影响正确性。
 *
 * 历史：此前 PayPal 汇率由 PAYPAL_CNY_TO_USD_RATE 固定值控制；现改为实时汇率
 * 优先，环境变量仅作兜底（见 README「PayPal 支付」章节）。
 */
import "server-only";

const DEFAULT_RATE = 0.14;
/** 请求单个汇率源的超时（毫秒）：两个源串行，最坏 ~6s 后进入降级路径 */
const SOURCE_TIMEOUT_MS = 3000;

type RateSource = {
  name: string;
  url: string;
  /** 从 API 响应中提取 USD 兑 1 CNY 的汇率 */
  pick: (data: any) => unknown;
};

/** 汇率源按优先级排列 */
const RATE_SOURCES: RateSource[] = [
  {
    name: "open.er-api.com",
    url: "https://open.er-api.com/v6/latest/CNY",
    pick: (d) => d?.rates?.USD,
  },
  {
    name: "frankfurter.dev",
    url: "https://api.frankfurter.dev/v2/rate/CNY/USD",
    pick: (d) => d?.rate,
  },
];

type CacheEntry = { rate: number; fetchedAt: number; kind: "real" | "fallback" };
let cached: CacheEntry | undefined;

/** 真实汇率的缓存时长（秒）；环境变量可覆盖，非法值回退默认 3600 */
export function fxCacheTtlSeconds(): number {
  const ttl = Number(process.env.FX_RATE_CACHE_TTL_SECONDS ?? "3600");
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 3600;
}

/** 降级值（stale-while-error / 固定兜底）的缓存时长（秒）：源恢复后尽快重试 */
export function fxFallbackTtlSeconds(): number {
  const ttl = Number(process.env.FX_RATE_FALLBACK_TTL_SECONDS ?? "300");
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 300;
}

function ttlFor(kind: CacheEntry["kind"]): number {
  return kind === "real" ? fxCacheTtlSeconds() : fxFallbackTtlSeconds();
}

/** 请求单个汇率源；任何异常 / 非 2xx / 非法数值都返回 null（触发下一源） */
async function fetchRateFrom(source: RateSource): Promise<number | null> {
  try {
    const res = await fetch(source.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(source.pick(data));
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/**
 * 获取当前 CNY→USD 汇率。
 * 缓存命中（真实汇率 1h / 降级值 5min）直接返回；否则按 RATE_SOURCES 顺序请求，
 * 全部失败时复用上次汇率（stale-while-error），无任何缓存才用固定兜底。
 */
export async function getCnyToUsdRate(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < ttlFor(cached.kind) * 1000) {
    return cached.rate;
  }

  for (const source of RATE_SOURCES) {
    const rate = await fetchRateFrom(source);
    if (rate !== null) {
      cached = { rate, fetchedAt: Date.now(), kind: "real" };
      return rate;
    }
  }

  if (cached) {
    // stale-while-error：复用上次汇率（可能已过期），按降级值缓存、短 TTL 尽快重试
    console.warn(`[fx] 实时汇率源均不可用，复用上次汇率 ${cached.rate}`);
    cached = { rate: cached.rate, fetchedAt: Date.now(), kind: "fallback" };
    return cached.rate;
  }

  const fallback = Number(process.env.PAYPAL_CNY_TO_USD_RATE ?? DEFAULT_RATE);
  const safe = Number.isFinite(fallback) && fallback > 0 ? fallback : DEFAULT_RATE;
  console.warn(`[fx] 实时汇率源均不可用且无缓存，退回固定汇率 ${safe}`);
  cached = { rate: safe, fetchedAt: Date.now(), kind: "fallback" };
  return safe;
}

/** CNY 金额 → USD 金额字符串（两位小数，PayPal 要求），按实时汇率换算 */
export async function cnyToUsd(cny: number): Promise<string> {
  const rate = await getCnyToUsdRate();
  return (Math.round(cny * rate * 100) / 100).toFixed(2);
}
