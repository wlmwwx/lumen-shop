"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  value,
  label,
  copiedLabel,
  className,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const flashCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };

    try {
      await navigator.clipboard.writeText(value);
      flashCopied();
    } catch {
      // 剪贴板不可用时（非 https/iframe）回退到选中文本
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) flashCopied();
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-border text-muted hover:border-foreground/40 hover:text-foreground"
      } ${className ?? ""}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
