"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteReviewAction } from "@/actions/admin";

export function ReviewRowActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const remove = () =>
    startTransition(async () => {
      if (confirm("确认删除这条评论？")) {
        await deleteReviewAction(id);
        router.refresh();
      }
    });

  return (
    <button
      onClick={remove}
      disabled={isPending}
      className="rounded-full p-1.5 text-[#8a8a86] transition-colors hover:bg-[#f4f4f1] hover:text-[#c5283d] disabled:opacity-40"
      title="删除"
    >
      <Trash2 size={15} />
    </button>
  );
}
