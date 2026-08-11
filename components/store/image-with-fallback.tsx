"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3f0ea] via-[#e8e2d8] to-[#dcd3c3]",
        className
      )}
    >
      <span className="text-lg font-light tracking-[0.3em] text-[#a89a82]">
        LUMEN
      </span>
    </div>
  );
}

export function ImageWithFallback({
  src,
  alt,
  className,
  imgClassName,
  ...rest
}: React.ComponentProps<typeof Image> & { imgClassName?: string }) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return <Placeholder className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={cn(className, imgClassName)}
      onError={() => setError(true)}
      {...rest}
    />
  );
}
