import { Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { ReviewRowActions } from "@/components/admin/review-row-actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "评论管理" };

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true, product: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">评论管理</h1>
        <p className="mt-1 text-sm text-[#8a8a86]">共 {reviews.length} 条评论</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e8e8e4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#eee] text-left text-xs uppercase tracking-wider text-[#8a8a86]">
              <th className="px-5 py-3 font-medium">商品</th>
              <th className="px-5 py-3 font-medium">顾客</th>
              <th className="px-5 py-3 font-medium">评分</th>
              <th className="px-5 py-3 font-medium">内容</th>
              <th className="px-5 py-3 font-medium">时间</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-b border-[#f3f3f0] last:border-0 hover:bg-[#fafaf8]">
                <td className="max-w-[180px] truncate px-5 py-3.5 font-medium">
                  {r.product.title}
                </td>
                <td className="px-5 py-3.5 text-[#5a5a56]">{r.user.name}</td>
                <td className="px-5 py-3.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={13}
                        className={cn(
                          n <= r.rating ? "fill-[#f0a500] text-[#f0a500]" : "text-[#e2e2de]"
                        )}
                      />
                    ))}
                  </div>
                </td>
                <td className="max-w-[320px] px-5 py-3.5">
                  <p className="truncate text-[#5a5a56]" title={r.comment}>
                    {r.comment}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#8a8a86]">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end">
                    <ReviewRowActions id={r.id} />
                  </div>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#a0a09b]">
                  暂无评论
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
