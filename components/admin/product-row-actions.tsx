"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteProductAction, toggleProductAction } from "@/actions/admin";

export function ProductRowActions({
  id,
  active,
  stock,
}: {
  id: string;
  active: boolean;
  stock: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () =>
    startTransition(async () => {
      await toggleProductAction(id);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (confirm(`确认删除该商品？${stock > 0 ? `（还有 ${stock} 件库存）` : ""}`)) {
        await deleteProductAction(id);
        router.refresh();
      }
    });

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggle}
        disabled={isPending}
        title={active ? "下架" : "上架"}
        className="rounded-full p-1.5 text-[#8a8a86] transition-colors hover:bg-[#f4f4f1] hover:text-[#1a1a1a] disabled:opacity-40"
      >
        {active ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <button
        onClick={remove}
        disabled={isPending}
        title="删除"
        className="rounded-full p-1.5 text-[#8a8a86] transition-colors hover:bg-[#f4f4f1] hover:text-[#c5283d] disabled:opacity-40"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
