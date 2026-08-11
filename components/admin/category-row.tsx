"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { deleteCategoryAction, updateCategoryAction } from "@/actions/admin";

type Cat = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  order: number;
};

export function CategoryRow({
  category,
  productCount,
}: {
  category: Cat;
  productCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const remove = () =>
    startTransition(async () => {
      if (confirm(`删除分类「${category.name}」？商品将变为未分类。`)) {
        await deleteCategoryAction(category.id);
        router.refresh();
      }
    });

  if (editing) {
    return (
      <tr className="border-b border-[#f3f3f0] bg-[#fafaf8]">
        <td colSpan={5} className="px-5 py-4">
          <form
            action={async (fd) => {
              fd.set("id", category.id);
              await updateCategoryAction(undefined, fd);
            }}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_80px_auto]"
          >
            <input name="name" defaultValue={category.name} required placeholder="名称" className="input-shop !py-2 text-sm" />
            <input name="nameEn" defaultValue={category.nameEn ?? ""} placeholder="Name (EN)" className="input-shop !py-2 text-sm" />
            <input name="slug" defaultValue={category.slug} required placeholder="slug" className="input-shop !py-2 text-sm" />
            <input name="order" type="number" defaultValue={category.order} className="input-shop !py-2 text-sm" />
            <div className="flex items-center gap-1">
              <button type="submit" className="rounded-full p-2 text-emerald-600 hover:bg-emerald-50" title="保存">
                <Check size={16} />
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-full p-2 text-[#8a8a86] hover:bg-[#f0f0ed]" title="取消">
                <X size={16} />
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[#f3f3f0] last:border-0 hover:bg-[#fafaf8]">
      <td className="px-5 py-3.5 font-medium">{category.name}</td>
      <td className="px-5 py-3.5 text-[#5a5a56]">{category.nameEn ?? "—"}</td>
      <td className="px-5 py-3.5 text-xs text-[#8a8a86]">{category.slug}</td>
      <td className="px-5 py-3.5 text-[#5a5a56]">{productCount}</td>
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setEditing(true)}
            className="rounded-full p-1.5 text-[#8a8a86] transition-colors hover:bg-[#f4f4f1] hover:text-[#1a1a1a]"
            title="编辑"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={remove}
            disabled={isPending}
            className="rounded-full p-1.5 text-[#8a8a86] transition-colors hover:bg-[#f4f4f1] hover:text-[#c5283d] disabled:opacity-40"
            title="删除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
