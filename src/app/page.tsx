import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Award,
  CalendarClock,
  Check,
  GraduationCap,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { getBrand } from "@/config/brand.server";
import type { Brand } from "@/config/brand";
import { getT } from "@/i18n/server";
import type { TFn } from "@/i18n/translate";
import { getSessionUser, getToken } from "@/lib/session";
import { LangSwitcher } from "@/components/LangSwitcher";
import { UserAvatar } from "@/components/UserAvatar";
import { Button, Card, HeroCard, IconTile, ProgressRing, cn, type Tone } from "@/components/ui";
import { BrandMark, telHref } from "@/components/public/brand-ui";

/**
 * Public landing page at "/" for any school: name, logo, colours and contact
 * details come from the deployment's brand; the copy only describes what the
 * portal really does. Server component — the CTA leads to the dashboard when
 * the visitor is signed in, else to the login page.
 */

export async function generateMetadata(): Promise<Metadata> {
  // getT() reads the language cookie, so this runs per request and the brand
  // (runtime BRAND_* env) is read then too.
  const t = await getT();
  const brand = getBrand();
  return {
    // Same segment as the root layout, whose title template does not apply here.
    title: `${t("landing.heroTitle", { app: brand.appName })} · ${brand.name}`,
    description: t("landing.heroSubtitle"),
  };
}

const FEATURES: { key: string; icon: LucideIcon; tone: Tone }[] = [
  { key: "lessons", icon: PlayCircle, tone: "primary" },
  { key: "progress", icon: TrendingUp, tone: "success" },
  { key: "grades", icon: Award, tone: "warning" },
  { key: "deadlines", icon: CalendarClock, tone: "accent" },
  { key: "messages", icon: MessagesSquare, tone: "violet" },
  { key: "mobile", icon: Smartphone, tone: "danger" },
];

const STEPS = ["signIn", "course", "track"] as const;

interface Cta {
  href: string;
  label: string;
}

interface ContactItem {
  key: "email" | "phone" | "address";
  icon: LucideIcon;
  text: string;
  href?: string;
}

/** Support contacts configured for the school; empty fields are left out. */
function contactItems({ email, phone, address }: Brand["support"]): ContactItem[] {
  const items: ContactItem[] = [];
  if (email) items.push({ key: "email", icon: Mail, text: email, href: `mailto:${email}` });
  if (phone) items.push({ key: "phone", icon: Phone, text: phone, href: telHref(phone) });
  if (address) items.push({ key: "address", icon: MapPin, text: address });
  return items;
}

export default async function LandingPage() {
  const [token, user, t] = await Promise.all([getToken(), getSessionUser(), getT()]);
  const brand = getBrand();
  const signedIn = Boolean(token) && user !== null;
  const cta: Cta = signedIn
    ? { href: "/dashboard", label: t("landing.goToDashboard") }
    : { href: "/login", label: t("auth.signIn") };
  const contacts = contactItems(brand.support);

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-control">
            <BrandMark src={brand.logoMark} size="md" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[15px] font-extrabold text-fg">{brand.appName}</span>
              <span className="hidden truncate text-xs text-subtle sm:block">{brand.shortName}</span>
            </span>
          </Link>
          <nav aria-label={t("landing.navLabel")} className="ml-6 hidden items-center gap-6 md:flex">
            <NavAnchor href="#features">{t("landing.nav.features")}</NavAnchor>
            <NavAnchor href="#how">{t("landing.nav.how")}</NavAnchor>
            {contacts.length > 0 && <NavAnchor href="#contact">{t("landing.nav.contact")}</NavAnchor>}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LangSwitcher />
            {signedIn ? (
              <Link
                href="/dashboard"
                aria-label={`${user.fullname} · ${t("landing.goToDashboard")}`}
                className="flex h-10 max-w-[220px] items-center gap-2 rounded-full border border-line bg-surface p-1 transition-colors hover:bg-surface-2 sm:pr-3"
              >
                <UserAvatar name={user.fullname} id={user.id} src={user.pictureurl} size={32} />
                <span className="hidden truncate text-sm font-semibold text-fg sm:block">{user.fullname}</span>
              </Link>
            ) : (
              <Button href={cta.href} size="md">
                {cta.label}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        <Hero brand={brand} cta={cta} t={t} />
        <Features brand={brand} t={t} />
        <HowItWorks brand={brand} t={t} />
        <CtaBand cta={cta} signedIn={signedIn} t={t} />
      </main>

      <Footer brand={brand} cta={cta} contacts={contacts} t={t} />
    </div>
  );
}

function NavAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="rounded-md text-sm font-semibold text-muted transition-colors hover:text-fg">
      {children}
    </a>
  );
}

function Hero({ brand, cta, t }: { brand: Brand; cta: Cta; t: TFn }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <HeroCard aria-labelledby="hero-title" className="p-6 sm:p-10 lg:p-12">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0 animate-fade-in-up">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
              <GraduationCap size={14} strokeWidth={2.2} className="shrink-0" />
              <span className="truncate">{brand.name}</span>
            </span>
            <h1 id="hero-title" className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t("landing.heroTitle", { app: brand.appName })}
            </h1>
            {brand.tagline && <p className="mt-3 text-lg font-semibold text-white/90">{brand.tagline}</p>}
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={cta.href} variant="light" size="lg">
                {cta.label}
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 text-[15px] font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t("landing.explore")}
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[13px] text-white/80">
              <ShieldCheck size={16} strokeWidth={2} className="shrink-0" />
              {t("landing.heroNote")}
            </p>
          </div>
          <HeroArt />
        </div>
      </HeroCard>
    </div>
  );
}

/** Decorative sketch of the portal (no data, no text) built from UI-kit pieces. */
function HeroArt() {
  return (
    <div aria-hidden className="relative mx-auto hidden w-full max-w-sm sm:block">
      <div className="rounded-card bg-surface p-5 text-fg shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <IconTile icon={PlayCircle} tone="primary" solid />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-2.5 w-3/4 rounded-full bg-surface-3" />
            <span className="block h-2 w-1/2 rounded-full bg-surface-2" />
          </div>
        </div>
        <span className="mt-5 block h-2.5 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full w-2/3 rounded-full bg-brand-gradient" />
        </span>
        <ul className="mt-5 space-y-3">
          {["w-5/6", "w-2/3", "w-3/4"].map((width, i) => (
            <li key={width} className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  i < 2 ? "bg-success-soft text-success-text" : "bg-surface-2 text-subtle"
                )}
              >
                <Check size={13} strokeWidth={3} />
              </span>
              <span className={cn("block h-2 rounded-full bg-surface-3", width)} />
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -right-4 -top-6 rounded-2xl bg-surface p-2.5 shadow-xl shadow-black/15 animate-float">
        <ProgressRing value={68} size={52} stroke={6} tone="success">
          <Award size={18} strokeWidth={2} className="text-success-text" />
        </ProgressRing>
      </div>
      <div className="absolute -bottom-6 -left-6 flex items-center gap-2.5 rounded-2xl bg-surface p-3 pr-5 shadow-xl shadow-black/15">
        <IconTile icon={CalendarClock} tone="warning" size="sm" solid />
        <span className="space-y-1.5">
          <span className="block h-2 w-20 rounded-full bg-surface-3" />
          <span className="block h-2 w-12 rounded-full bg-surface-2" />
        </span>
      </div>
      <div className="absolute -right-3 bottom-10 rounded-2xl bg-surface p-2.5 shadow-xl shadow-black/15">
        <IconTile icon={MessagesSquare} tone="violet" size="sm" />
      </div>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, subtitle }: { id: string; eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[13px] font-bold uppercase tracking-wider text-primary-text">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}

function Features({ brand, t }: { brand: Brand; t: TFn }) {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="features-title"
          eyebrow={t("landing.nav.features")}
          title={t("landing.featuresTitle")}
          subtitle={t("landing.featuresSubtitle", { app: brand.appName, school: brand.shortName })}
        />
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon, tone }) => (
            <li key={key}>
              <Card className="h-full p-6">
                <IconTile icon={icon} tone={tone} solid />
                <h3 className="mt-5 text-base font-bold text-fg">{t(`landing.features.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`landing.features.${key}.text`)}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks({ brand, t }: { brand: Brand; t: TFn }) {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 border-y border-line/60 bg-surface-2/60 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="how-title" eyebrow={t("landing.nav.how")} title={t("landing.howTitle")} />
        <ol className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step}>
              <Card className="h-full p-6">
                <span className="grid size-10 place-items-center rounded-full bg-brand-gradient text-sm font-extrabold tabular-nums text-white shadow-md shadow-primary/25">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-base font-bold text-fg">{t(`landing.steps.${step}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {t(`landing.steps.${step}.text`, { school: brand.shortName })}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CtaBand({ cta, signedIn, t }: { cta: Cta; signedIn: boolean; t: TFn }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <HeroCard aria-labelledby="cta-title" className="px-6 py-12 text-center sm:px-12 sm:py-16">
        <h2 id="cta-title" className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight sm:text-4xl">
          {t("landing.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">
          {t(signedIn ? "landing.ctaSubtitleSignedIn" : "landing.ctaSubtitle")}
        </p>
        <Button href={cta.href} variant="light" size="lg" className="mt-8">
          {cta.label}
          <ArrowRight size={16} strokeWidth={2.2} />
        </Button>
      </HeroCard>
    </div>
  );
}

function Footer({ brand, cta, contacts, t }: { brand: Brand; cta: Cta; contacts: ContactItem[]; t: TFn }) {
  const link = "rounded-md transition-colors hover:text-fg";
  return (
    <footer id="contact" className="scroll-mt-20 border-t border-line/60 bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 text-sm text-muted sm:px-6 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark src={brand.logoMark} size="lg" />
            <div className="min-w-0 leading-tight">
              <p className="font-extrabold text-fg">{brand.appName}</p>
              <p className="text-xs text-subtle">{brand.name}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm leading-relaxed">{brand.description}</p>
        </div>

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="text-[13px] font-bold text-fg">
            {t("landing.footerLinks")}
          </h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href="#features" className={link}>
                {t("landing.nav.features")}
              </a>
            </li>
            <li>
              <a href="#how" className={link}>
                {t("landing.nav.how")}
              </a>
            </li>
            <li>
              <Link href={cta.href} className={link}>
                {cta.label}
              </Link>
            </li>
          </ul>
        </nav>

        {contacts.length > 0 && (
          <div>
            <h2 className="text-[13px] font-bold text-fg">{t("landing.nav.contact")}</h2>
            <dl className="mt-4 space-y-2.5">
              {contacts.map(({ key, icon: Icon, text, href }) => (
                <div key={key} className="flex items-start gap-2.5">
                  <dt className="mt-0.5 shrink-0 text-subtle">
                    <Icon size={16} strokeWidth={1.85} aria-hidden />
                    <span className="sr-only">{t(`landing.contact.${key}`)}</span>
                  </dt>
                  <dd className="min-w-0 break-words">
                    {href ? (
                      <a href={href} className={link}>
                        {text}
                      </a>
                    ) : (
                      text
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      <div className="border-t border-line/60">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-subtle sm:px-6">
          © {new Date().getFullYear()} {brand.name}
        </p>
      </div>
    </footer>
  );
}
