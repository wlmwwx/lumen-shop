"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { subscribeAction } from "@/actions/store";

export function NewsletterForm({
  placeholder,
  button,
  successText,
}: {
  placeholder: string;
  button: string;
  successText: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("loading");
    const res = await subscribeAction(email);
    setState(res.ok ? "done" : "error");
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-foreground/15 bg-surface px-6 py-3.5 text-sm font-medium">
        <Check size={16} className="text-foreground" />
        {successText}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="input-shop flex-1 rounded-full"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="btn-primary shrink-0 !px-6"
      >
        {state === "loading" ? "…" : button}
        {state !== "loading" && <ArrowRight size={15} />}
      </button>
    </form>
  );
}
