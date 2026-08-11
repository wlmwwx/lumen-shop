import { prisma } from "@/lib/db";

export async function getOrderReviewStats(
  userId: string,
  productIds: string[]
): Promise<{ reviewedIds: Set<string>; reviewedCount: number; avgRating: number }> {
  if (productIds.length === 0) {
    return { reviewedIds: new Set(), reviewedCount: 0, avgRating: 0 };
  }
  const reviews = await prisma.review.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true, rating: true },
  });
  const reviewedIds = new Set(reviews.map((r) => r.productId));
  return {
    reviewedIds,
    reviewedCount: reviewedIds.size,
    avgRating:
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0,
  };
}
