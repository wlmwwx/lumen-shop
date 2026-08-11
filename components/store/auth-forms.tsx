"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

export function AuthForms({
  labels,
}: {
  labels: {
    login: string;
    register: string;
    email: string;
    password: string;
    name: string;
    loginBtn: string;
    registerBtn: string;
    switchToRegister: string;
    switchToLogin: string;
  };
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginActionFn, loginPending] = useActionState(loginAction, undefined);
  const [regState, regActionFn, regPending] = useActionState(registerAction, undefined);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 grid grid-cols-2 rounded-full border border-border p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full py-2 text-sm font-medium transition-all duration-200",
              mode === m ? "bg-foreground text-white" : "text-muted hover:text-foreground"
            )}
          >
            {m === "login" ? labels.login : labels.register}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form action={loginActionFn} className="space-y-4">
          <div>
            <label className="label-shop">{labels.email}</label>
            <input name="email" type="email" required className="input-shop" />
          </div>
          <div>
            <label className="label-shop">{labels.password}</label>
            <input name="password" type="password" required className="input-shop" />
          </div>
          {loginState?.error && (
            <p className="text-sm text-sale">{loginState.error}</p>
          )}
          <button type="submit" disabled={loginPending} className="btn-primary w-full">
            {loginPending ? "…" : labels.loginBtn}
          </button>
        </form>
      ) : (
        <form action={regActionFn} className="space-y-4">
          <div>
            <label className="label-shop">{labels.name}</label>
            <input name="name" required maxLength={40} className="input-shop" />
          </div>
          <div>
            <label className="label-shop">{labels.email}</label>
            <input name="email" type="email" required className="input-shop" />
          </div>
          <div>
            <label className="label-shop">{labels.password}</label>
            <input name="password" type="password" required minLength={6} className="input-shop" />
          </div>
          {regState?.error && <p className="text-sm text-sale">{regState.error}</p>}
          <button type="submit" disabled={regPending} className="btn-primary w-full">
            {regPending ? "…" : labels.registerBtn}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            {labels.switchToRegister}{" "}
            <button
              onClick={() => setMode("register")}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {labels.register}
            </button>
          </>
        ) : (
          <>
            {labels.switchToLogin}{" "}
            <button
              onClick={() => setMode("login")}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {labels.login}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
