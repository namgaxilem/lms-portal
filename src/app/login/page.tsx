"use client";
import { useState } from "react";
import Image from "next/image";
import loginPhoto from "../../../public/images/photos/login.webp";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MessagesSquare,
  PlayCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Button, Card, Input, Label } from "@/components/ui";
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

  const features = [
    { icon: PlayCircle, label: t("auth.heroFeatureA") },
    { icon: MessagesSquare, label: t("auth.heroFeatureB") },
    { icon: ShieldCheck, label: t("auth.secureNote") },
  ];

  return (
    <main className="flex min-h-screen w-full bg-canvas text-fg">
      {/* Photo panel (lg+) */}
      <aside className="relative hidden w-[55%] overflow-hidden lg:block">
        <Image
          src={loginPhoto}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="55vw"
          className="object-cover"
        />
        <div className="bg-photo-overlay absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <div className="flex items-center gap-3">
            <Image
              src={brand.logoMark}
              alt={brand.name}
              width={56}
              height={56}
              priority
              className="h-14 w-14 object-contain drop-shadow-lg"
            />
            <div className="leading-tight">
              <p className="text-base font-semibold">{brand.appName}</p>
              <p className="text-sm text-white/75">{brand.name}</p>
            </div>
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              {t("auth.heroTitle")}{" "}
              <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">
                {t("auth.heroAccent")}
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              {t("auth.heroSubtitle")}
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {features.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm backdrop-blur-md"
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/60">© {new Date().getFullYear()} {brand.name}</p>
        </div>
      </aside>

      {/* Form column */}
      <section className="bg-mesh relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <LangSwitcher />
        </div>

        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Mobile: photo banner with logo */}
          <div className="relative mb-6 overflow-hidden rounded-2xl lg:hidden">
            <Image
              src={loginPhoto}
              alt=""
              placeholder="blur"
              sizes="(max-width: 1024px) 100vw, 0px"
              className="h-36 w-full object-cover"
              priority
            />
            <div className="bg-photo-overlay absolute inset-0" />
            <div className="absolute inset-0 flex items-center gap-3 px-5 text-white">
              <Image
                src={brand.logoMark}
                alt={brand.name}
                width={52}
                height={52}
                className="h-13 w-13 object-contain drop-shadow-lg"
              />
              <div className="min-w-0 leading-tight">
                <p className="text-base font-semibold">{brand.appName}</p>
                <p className="truncate text-xs text-white/80">{brand.name}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 hidden justify-center lg:flex">
            <Image
              src={brand.logoMark}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 object-contain drop-shadow-md"
            />
          </div>

          <Card className="p-6 shadow-pop sm:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-fg">
                {t("auth.welcome")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("auth.subtitle")}</p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-error/20 bg-error-soft px-3 py-2.5 text-[13px] text-error"
              >
                <AlertCircle size={16} strokeWidth={1.75} className="mt-px shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div>
                <Label htmlFor="username">{t("auth.username")}</Label>
                <Input
                  id="username"
                  name="username"
                  icon={User}
                  autoComplete="username"
                  autoFocus
                  placeholder={t("auth.usernamePlaceholder")}
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
                  trailing={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                      aria-pressed={showPass}
                      onClick={() => setShowPass((s) => !s)}
                    >
                      {showPass ? (
                        <EyeOff size={16} strokeWidth={1.75} />
                      ) : (
                        <Eye size={16} strokeWidth={1.75} />
                      )}
                    </Button>
                  }
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                aria-busy={loading}
                className="mt-2 w-full"
              >
                {loading && <Loader2 size={16} strokeWidth={2} className="animate-spin" />}
                {t("auth.signIn")}
              </Button>
            </form>
          </Card>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-subtle">
            <ShieldCheck size={14} strokeWidth={1.75} />
            {t("auth.secureNote")}
          </p>
        </div>
      </section>
    </main>
  );
}
