"use client";

import { useState } from "react";
import { ImageWithFallback } from "@/components/store/image-with-fallback";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) images = [""];

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {/* 缩略图 */}
      {images.length > 1 && (
        <div className="flex gap-3 sm:flex-col">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all duration-200",
                active === i
                  ? "border-foreground"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <ImageWithFallback
                src={src}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
      {/* 主图 */}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-xl bg-surface">
        <ImageWithFallback
          key={active}
          src={images[active]}
          alt={title}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
