"use client";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowUpRight, Clock, Construction, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, Card, Input, Label } from "@/components/ui";
import type { LoginSiteSettings } from "../types";
import { Notice } from "./Notice";
import { PublicHtml } from "./PublicHtml";
import { describeLoginError, readLoginError, type LoginError } from "./login-errors";

const ERROR_ID = "login-error";

/** Username/password card: posts to /api/auth/login, then opens the dashboard. */
export function LoginForm({ sessionExpired, settings }: { sessionExpired: boolean; settings: LoginSiteSettings }) {
  const t = useT();
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const usernameInput = form.elements.namedItem("username") as HTMLInputElement;
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      setError({ message: username ? t("auth.enterPassword") : t(usernameKey(settings, "enter")) });
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // A full page load (keeping the busy state meanwhile), so no response
        // cached in this tab for a previous user can show up for this one.
        window.location.replace("/dashboard");
        return;
      }
      const body = await readLoginError(res);
      setError(describeLoginError(body, t));
      if (body.code === "invalidlogin") {
        passwordInput.value = "";
        passwordInput.focus();
      }
    } catch {
      setError({ message: t("auth.serverError") });
    }
    setLoading(false);
  }

  return (
    <Card className="p-6 shadow-pop sm:p-8">
      <h2 className="text-2xl font-extrabold tracking-tight text-fg">{t("auth.welcome")}</h2>
      <p className="mt-1 text-sm text-muted">{t("auth.subtitle")}</p>

      <div className="mt-6 space-y-3 empty:hidden">
        {settings.maintenance && (
          <Notice tone="warning" icon={Construction} title={t("auth.maintenanceTitle")}>
            {settings.maintenance.message ? (
              <PublicHtml html={settings.maintenance.message} />
            ) : (
              <p>{t("auth.maintenanceHint")}</p>
            )}
          </Notice>
        )}
        {sessionExpired && !error && (
          <Notice tone="info" icon={Clock} role="status">
            {t("auth.sessionExpired")}
          </Notice>
        )}
        {error && <ErrorNotice error={error} />}
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <Label htmlFor="username">{t(usernameKey(settings, "label"))}</Label>
          <Input
            id="username"
            name="username"
            icon={User}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            placeholder={t(usernameKey(settings, "enter"))}
            aria-describedby={error ? ERROR_ID : undefined}
          />
        </div>

        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            name="password"
            icon={Lock}
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-describedby={error ? ERROR_ID : undefined}
            trailing={
              <Button
                variant="ghost"
                size="icon"
                aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                aria-pressed={showPass}
                onClick={() => setShowPass((s) => !s)}
              >
                {showPass ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
              </Button>
            }
          />
          {settings.forgotPasswordUrl && <ForgotPasswordLink href={settings.forgotPasswordUrl} />}
        </div>

        <Button type="submit" variant="gradient" size="lg" disabled={loading} aria-busy={loading} className="w-full">
          {loading && <Loader2 size={16} strokeWidth={2} className="animate-spin" />}
          {t("auth.signIn")}
        </Button>
      </form>
    </Card>
  );
}

/** "Username or email" wording when Moodle accepts email sign-in. */
function usernameKey(settings: LoginSiteSettings, kind: "label" | "enter") {
  if (kind === "label") return settings.loginViaEmail ? "auth.usernameOrEmail" : "auth.username";
  return settings.loginViaEmail ? "auth.enterUsernameOrEmail" : "auth.enterUsername";
}

function ErrorNotice({ error }: { error: LoginError }) {
  return (
    <Notice tone="error" icon={AlertCircle} role="alert" id={ERROR_ID}>
      <p>{error.message}</p>
      {error.detail && <p className="opacity-80">{error.detail}</p>}
      {error.action && (
        <a
          href={error.action.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
        >
          {error.action.label}
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden />
        </a>
      )}
    </Notice>
  );
}

/** Password reset happens on the Moodle site (or the admin's custom URL / mailto:). */
function ForgotPasswordLink({ href }: { href: string }) {
  const t = useT();
  const external = /^https?:/i.test(href);
  return (
    <p className="mt-1 text-right">
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="inline-flex min-h-10 items-center rounded-md text-[13px] font-semibold text-primary-text hover:underline"
      >
        {t("auth.forgotPassword")}
      </a>
    </p>
  );
}
