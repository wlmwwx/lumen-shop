/**
 * Tests for lib/fx.ts - 实时汇率（双源 + 缓存 + 兜底）。
 *
 * 使用 vi.resetModules() + 动态 import 重置模块级缓存，避免测试间相互影响；
 * 通过 vi.stubGlobal("fetch", ...) 模拟汇率源响应，不触网。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** 动态加载模块（每次 resetModules 后重新 import，清空模块级缓存） */
async function loadFx() {
  return import("@/lib/fx");
}

/** 构造一个成功响应的 fetch mock */
function okJson(data: unknown) {
  return async () => ({ ok: true, json: async () => data });
}

describe("getCnyToUsdRate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env.PAYPAL_CNY_TO_USD_RATE;
    delete process.env.FX_RATE_CACHE_TTL_SECONDS;
    delete process.env.FX_RATE_FALLBACK_TTL_SECONDS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYPAL_CNY_TO_USD_RATE;
    delete process.env.FX_RATE_CACHE_TTL_SECONDS;
    delete process.env.FX_RATE_FALLBACK_TTL_SECONDS;
  });

  it("主源 open.er-api.com 成功：返回 rates.USD 并缓存（重复调用不再请求）", async () => {
    const fetchMock = vi.fn(
      okJson({ result: "success", base_code: "CNY", rates: { USD: 0.14, EUR: 0.128 } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // 缓存命中：第二次调用不发请求
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("主源失败（非 2xx）→ 回退 frankfurter.dev 的 rate 字段", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce(
        okJson({ date: "2026-08-16", base: "CNY", quote: "USD", rate: 0.1412 })()
      );
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.1412, 5);
  });

  it("主源响应畸形（缺 rates.USD）→ 回退 frankfurter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ result: "error", rates: undefined })())
      .mockResolvedValueOnce(okJson({ rate: 0.145 })());
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.145, 5);
  });

  it("两个源都失败 → 退回 PAYPAL_CNY_TO_USD_RATE 兜底汇率", async () => {
    process.env.PAYPAL_CNY_TO_USD_RATE = "0.15";
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.15, 5);
  });

  it("源异常且无兜底配置 → 默认 0.14，且兜底结果也会缓存", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);
    // 缓存了兜底值，不再反复请求故障源
    expect(fetchMock).toHaveBeenCalledTimes(2); // 两源各一次，第二次调用未触网
  });

  it("stale-while-error：源故障时复用上次真实汇率，而非固定兜底", async () => {
    process.env.PAYPAL_CNY_TO_USD_RATE = "0.5"; // 若误用兜底会得到 0.5，便于区分
    process.env.FX_RATE_CACHE_TTL_SECONDS = "1";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ rates: { USD: 0.14 } })()) // 首次成功：真实 0.14
      .mockRejectedValue(new Error("down")); // TTL 过期后两源都失败
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);

    await new Promise((r) => setTimeout(r, 1100));
    // 复用旧真实汇率 0.14，而不是跳到 0.5
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);
  });

  it("降级值短 TTL：窗口内不重复请求，过期后重试源", async () => {
    process.env.FX_RATE_FALLBACK_TTL_SECONDS = "1";
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    expect(await fx.getCnyToUsdRate()).toBeCloseTo(0.14, 5);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 两源各一次

    // 降级缓存窗口内：不重复请求故障源
    await fx.getCnyToUsdRate();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 窗口过期后：重新请求源（期待恢复）
    await new Promise((r) => setTimeout(r, 1100));
    await fx.getCnyToUsdRate();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });

  it("TTL 过期后重新拉取", async () => {
    process.env.FX_RATE_CACHE_TTL_SECONDS = "1";
    const fetchMock = vi.fn(okJson({ rates: { USD: 0.14 } }));
    vi.stubGlobal("fetch", fetchMock);

    const fx = await loadFx();
    await fx.getCnyToUsdRate();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 1100));
    await fx.getCnyToUsdRate();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("cnyToUsd", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    delete process.env.PAYPAL_CNY_TO_USD_RATE;
    delete process.env.FX_RATE_CACHE_TTL_SECONDS;
    delete process.env.FX_RATE_FALLBACK_TTL_SECONDS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYPAL_CNY_TO_USD_RATE;
    delete process.env.FX_RATE_CACHE_TTL_SECONDS;
    delete process.env.FX_RATE_FALLBACK_TTL_SECONDS;
  });

  it("按实时汇率换算并保留两位小数", async () => {
    vi.stubGlobal("fetch", vi.fn(okJson({ rates: { USD: 0.14 } })));
    const fx = await loadFx();
    expect(await fx.cnyToUsd(112)).toBe("15.68"); // 112 × 0.14 = 15.68
    expect(await fx.cnyToUsd(19.9)).toBe("2.79"); // 19.9 × 0.14 = 2.786 → 2.79
    expect(await fx.cnyToUsd(1.04)).toBe("0.15"); // 0.1456 → 0.15
  });
});
