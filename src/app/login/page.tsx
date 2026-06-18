"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { MaterialIcon } from "@/components/MaterialIcon";
import { brand } from "@/config/brand";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!username || !password) {
      setError(username ? t("auth.enterPassword") : t("auth.enterUsername"));
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
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("auth.failed"));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(t("auth.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full overflow-hidden">
      {/* Left visual panel */}
      <section className="relative hidden items-center justify-center overflow-hidden bg-primary lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-tertiary" />
        <div
          className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-secondary/20 blur-3xl animate-float"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-inverse-primary/20 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative z-10 max-w-lg p-xl text-on-primary">
          <span className="mb-xs inline-block rounded-full border border-secondary-container/30 bg-secondary-container/20 px-4 py-1.5 font-label-md text-label-md text-secondary-fixed backdrop-blur-sm">
            {brand.name.toUpperCase()}
          </span>
          <h1 className="mb-sm font-display-lg text-display-lg leading-tight">
            {t("auth.heroTitle")} <br />
            <span className="text-secondary-fixed">{t("auth.heroAccent")}</span>
          </h1>
          <p className="font-body-lg text-body-lg leading-relaxed text-primary-fixed/80">
            {t("auth.heroSubtitle")}
          </p>

          <div className="mt-lg grid grid-cols-2 gap-base">
            <div
              className="animate-float rounded-xl border border-white/10 bg-white/10 p-md backdrop-blur-md"
              style={{ animationDelay: "0s" }}
            >
              <MaterialIcon name="play_circle" className="mb-xs text-secondary-fixed" />
              <div className="font-headline-sm text-headline-sm">SCORM</div>
              <div className="font-label-md text-label-md opacity-70">
                {t("auth.heroFeatureA")}
              </div>
            </div>
            <div
              className="animate-float rounded-xl border border-white/10 bg-white/10 p-md backdrop-blur-md"
              style={{ animationDelay: "1.5s" }}
            >
              <MaterialIcon name="forum" className="mb-xs text-secondary-fixed" />
              <div className="font-headline-sm text-headline-sm">Chat</div>
              <div className="font-label-md text-label-md opacity-70">
                {t("auth.heroFeatureB")}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-gutter left-gutter z-10 flex items-center gap-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-lg">
            <Image
              src="/images/main-logo.png"
              alt={brand.name}
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-headline-md text-headline-md font-extrabold tracking-tight text-on-primary">
            {brand.shortName}
          </span>
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex w-full items-center justify-center bg-surface p-sm md:p-gutter lg:w-1/2">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/images/main-logo.png"
                alt={brand.name}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                priority
              />
              <span className="font-headline-sm text-headline-sm font-extrabold text-primary lg:hidden">
                {brand.shortName}
              </span>
            </div>
            <LangSwitcher />
          </div>

          <div className="mb-lg">
            <h2 className="mb-xs font-headline-md text-headline-md text-on-surface">
              {t("auth.welcome")}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t("auth.subtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-sm flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 font-body-sm text-body-sm text-on-error-container animate-fade-in">
              <MaterialIcon name="error" className="!text-lg" />
              {error}
            </div>
          )}

          <form className="space-y-sm" onSubmit={onSubmit}>
            <div className="space-y-base">
              <label
                htmlFor="username"
                className="px-1 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant"
              >
                {t("auth.username")}
              </label>
              <div className="relative">
                <MaterialIcon
                  name="person"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  className="w-full rounded-xl border-none bg-surface-container-low py-4 pl-12 pr-4 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline/50 focus:bg-white focus:ring-2 focus:ring-primary"
                  placeholder="namgaxilem"
                />
              </div>
            </div>

            <div className="space-y-base">
              <label
                htmlFor="password"
                className="px-1 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant"
              >
                {t("auth.password")}
              </label>
              <div className="relative">
                <MaterialIcon
                  name="lock"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-xl border-none bg-surface-container-low py-4 pl-12 pr-12 font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline/50 focus:bg-white focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label="Toggle password"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-on-surface"
                >
                  <MaterialIcon name={showPass ? "visibility_off" : "visibility"} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-xs flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-headline-sm text-headline-sm text-on-primary shadow-[0px_4px_20px_rgba(31,16,142,0.2)] transition-all duration-300 hover:bg-on-primary-fixed-variant active:scale-[0.98] disabled:opacity-70"
            >
              {loading && (
                <MaterialIcon name="progress_activity" className="animate-spin" />
              )}
              {t("auth.signIn")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
