"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createProductAction, updateProductAction } from "@/actions/admin";
import { slugify } from "@/lib/utils";

type CategoryOption = { id: string; name: string };
type VariantRow = {
  id?: string;
  name: string;
  nameEn: string;
  value: string;
  valueEn: string;
};

type InitialData = {
  id: string;
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  images: string;
  categoryId: string | null;
  featured: boolean;
  active: boolean;
  variants: VariantRow[];
};

const emptyVariant = (): VariantRow => ({
  name: "颜色",
  nameEn: "Color",
  value: "",
  valueEn: "",
});

export function ProductForm({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial?: InitialData;
}) {
  const isEdit = !!initial;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateProductAction : createProductAction,
    undefined
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    initial?.variants?.length ? initial.variants : []
  );
  const [autoSlug, setAutoSlug] = useState(!initial);

  const setVariant = (i: number, key: keyof VariantRow, val: string) =>
    setVariants((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, [key]: val } : v))
    );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const fd = new FormData(e.currentTarget);
    fd.set("variants", JSON.stringify(variants.filter((v) => v.name && v.value)));
    if (isEdit) fd.set("id", initial!.id);
    formAction(fd);
    e.preventDefault();
  };

  const label =
    "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#8a8a86]";
  const input =
    "w-full rounded-lg border border-[#e2e2de] bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[#1a1a1a] focus:ring-2 focus:ring-[#1a1a1a]/10";

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {state?.error && (
        <p className="rounded-lg bg-[#c5283d]/5 px-4 py-3 text-sm text-[#c5283d]">
          {state.error}
        </p>
      )}

      {/* 基本信息 */}
      <section className="rounded-xl border border-[#e8e8e4] bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold">基本信息</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label}>标题（中文）*</label>
            <input
              name="title"
              required
              defaultValue={initial?.title}
              onChange={(e) => {
                if (autoSlug) {
                  const el = document.querySelector<HTMLInputElement>('input[name="slug"]');
                  if (el) el.value = slugify(e.target.value);
                }
              }}
              className={input}
            />
          </div>
          <div>
            <label className={label}>标题（English）</label>
            <input name="titleEn" defaultValue={initial?.titleEn} className={input} />
          </div>
          <div>
            <label className={label}>
              Slug *
              <button
                type="button"
                onClick={() => setAutoSlug((v) => !v)}
                className="ml-2 rounded-full bg-[#f4f4f1] px-2 py-0.5 text-[10px] text-[#8a8a86]"
              >
                {autoSlug ? "自动生成" : "手动"}
              </button>
            </label>
            <input
              name="slug"
              required
              defaultValue={initial?.slug}
              className={input}
            />
          </div>
          <div>
            <label className={label}>分类</label>
            <select name="categoryId" defaultValue={initial?.categoryId ?? ""} className={input}>
              <option value="">未分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>描述（中文）*</label>
            <textarea
              name="description"
              required
              rows={4}
              defaultValue={initial?.description}
              className={`${input} resize-none`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>描述（English）</label>
            <textarea
              name="descriptionEn"
              rows={4}
              defaultValue={initial?.descriptionEn}
              className={`${input} resize-none`}
            />
          </div>
        </div>
      </section>

      {/* 价格库存 */}
      <section className="rounded-xl border border-[#e8e8e4] bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold">价格与库存</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={label}>售价（¥）*</label>
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={initial?.price}
              className={input}
            />
          </div>
          <div>
            <label className={label}>划线价（¥，选填）</label>
            <input
              name="compareAtPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.compareAtPrice ?? ""}
              className={input}
            />
          </div>
          <div>
            <label className={label}>库存 *</label>
            <input
              name="stock"
              type="number"
              min={0}
              required
              defaultValue={initial?.stock ?? 10}
              className={input}
            />
          </div>
        </div>
      </section>

      {/* 图片 */}
      <section className="rounded-xl border border-[#e8e8e4] bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold">图片</h2>
        <p className="mb-4 text-xs text-[#a0a09b]">
          每行一张图片 URL（支持 Unsplash 外链），第一张为主图
        </p>
        <textarea
          name="images"
          required
          rows={4}
          defaultValue={initial?.images}
          placeholder={"https://images.unsplash.com/photo-xxxxx"}
          className={`${input} resize-none font-mono text-xs`}
        />
      </section>

      {/* 变体 */}
      <section className="rounded-xl border border-[#e8e8e4] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">变体（颜色 / 尺码等，选填）</h2>
          <button
            type="button"
            onClick={() => setVariants((v) => [...v, emptyVariant()])}
            className="flex items-center gap-1 rounded-full border border-[#e2e2de] px-3 py-1.5 text-xs transition-colors hover:border-[#1a1a1a]"
          >
            <Plus size={13} /> 添加变体
          </button>
        </div>
        {variants.length === 0 ? (
          <p className="text-sm text-[#a0a09b]">暂无变体，商品将按单品出售</p>
        ) : (
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 rounded-lg bg-[#fafaf8] p-3 sm:grid-cols-5">
                <input
                  value={v.name}
                  onChange={(e) => setVariant(i, "name", e.target.value)}
                  placeholder="属性名（颜色）"
                  className={input}
                />
                <input
                  value={v.nameEn}
                  onChange={(e) => setVariant(i, "nameEn", e.target.value)}
                  placeholder="Name (Color)"
                  className={input}
                />
                <input
                  value={v.value}
                  onChange={(e) => setVariant(i, "value", e.target.value)}
                  placeholder="值（白色）"
                  className={input}
                />
                <input
                  value={v.valueEn}
                  onChange={(e) => setVariant(i, "valueEn", e.target.value)}
                  placeholder="Value (White)"
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex items-center justify-center rounded-lg text-[#8a8a86] transition-colors hover:text-[#c5283d]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 开关 */}
      <section className="flex flex-wrap items-center gap-8 rounded-xl border border-[#e8e8e4] bg-white p-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initial?.featured}
            className="h-4 w-4 accent-[#1a1a1a]"
          />
          首页精选
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial ? initial.active : true}
            className="h-4 w-4 accent-[#1a1a1a]"
          />
          立即上架
        </label>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1a1a1a] px-10 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#333333] disabled:opacity-50"
        >
          {pending ? "保存中…" : isEdit ? "保存修改" : "创建商品"}
        </button>
        <a
          href="/admin/products"
          className="text-sm text-[#8a8a86] underline-offset-4 hover:underline"
        >
          取消
        </a>
      </div>
    </form>
  );
}
