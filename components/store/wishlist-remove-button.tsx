"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toggleWishlistAction } from "@/actions/store";
import { useRouter } from "@/i18n/navigation";

export function WishlistRemoveButton({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleWishlistAction(productId);
          router.refresh();
        })
      }
      className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-sale disabled:opacity-50"
    >
      <Trash2 size={13} /> {isPending ? "…" : label}
    </button>
  );
}
