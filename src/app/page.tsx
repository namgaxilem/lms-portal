import Image from "next/image";
import heroPhoto from "../../public/images/photos/hero.webp";
import graduationPhoto from "../../public/images/photos/graduation.webp";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Bell,
  Briefcase,
  Calculator,
  ClipboardCheck,
  Gavel,
  Globe,
  Landmark,
  Languages,
  Mail,
  MapPin,
  MessagesSquare,
  MonitorSmartphone,
  Phone,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { getToken } from "@/lib/session";
import { getLocale } from "@/i18n/server";
import { LangSwitcher } from "@/components/LangSwitcher";
import { UserAvatar } from "@/components/UserAvatar";
import { getSessionUser } from "@/lib/session";
import { Button, Card, buttonClass, IconTile, type Tone } from "@/components/ui";
import { brand } from "@/config/brand";

/**
 * Public marketing landing at "/". Server component: reads the auth cookie to
 * point the CTA at the dashboard (logged in) or login, and the locale cookie to
 * pick copy. Minimal layout on the app's neutral design tokens.
 */

const COPY = {
  vi: {
    nav: { features: "Tính năng", programs: "Chương trình", contact: "Liên hệ" },
    login: "Đăng nhập",
    enterPortal: "Vào hệ thống",
    explore: "Khám phá tính năng",
    heroBadge: brand.name,
    heroTitle: "Nền tảng học tập trực tuyến",
    heroAccent: "của UFM",
    heroSubtitle:
      "Bài giảng SCORM, bài kiểm tra, bảng điểm và trao đổi với giảng viên — tất cả trong một hệ thống E‑Learning hiện đại.",
    stats: [
      { n: "50+", l: "Khóa học" },
      { n: "5", l: "Chuyên ngành" },
      { n: "SCORM", l: "Bài giảng tương tác" },
      { n: "VI / EN", l: "Song ngữ" },
    ],
    featuresTitle: "Mọi thứ bạn cần để học tập",
    featuresSubtitle:
      "Một cổng học tập gọn gàng kết nối trực tiếp với hệ thống Moodle của nhà trường.",
    features: [
      { icon: PlayCircle, t: "Bài giảng SCORM", d: "Học các bài giảng tương tác ngay trong trình duyệt." },
      { icon: ClipboardCheck, t: "Trắc nghiệm & Bài kiểm tra", d: "Làm bài và xem kết quả theo từng khóa học." },
      { icon: Award, t: "Bảng điểm", d: "Theo dõi điểm số và tiến độ của bạn theo thời gian thực." },
      { icon: MessagesSquare, t: "Tin nhắn & Diễn đàn", d: "Trao đổi trực tiếp với giảng viên và bạn học." },
      { icon: Bell, t: "Thông báo", d: "Không bỏ lỡ hạn nộp bài hay thông báo quan trọng." },
      { icon: MonitorSmartphone, t: "Đa nền tảng", d: "Trải nghiệm mượt mà trên máy tính và điện thoại." },
    ],
    programsTitle: "Các chuyên ngành đào tạo",
    programsSubtitle: "Chương trình ứng dụng, đạt chuẩn quốc gia và quốc tế.",
    programs: [
      { icon: Calculator, t: "Kế toán", d: "Kế toán tài chính, quản trị, chi phí và thuế." },
      { icon: Briefcase, t: "Quản trị kinh doanh", d: "Hành vi tổ chức, chiến lược và vận hành." },
      { icon: Landmark, t: "Tài chính doanh nghiệp", d: "Thị trường tài chính và hoạch định tài chính." },
      { icon: Languages, t: "Tiếng Anh kinh doanh", d: "Kỹ năng ngôn ngữ cho môi trường kinh doanh." },
      { icon: Gavel, t: "Luật kinh doanh & đầu tư", d: "Kiến thức pháp luật kinh tế và đầu tư." },
    ],
    howEyebrow: "Cách hoạt động",
    howTitle: "Bắt đầu chỉ với 3 bước",
    how: [
      { t: "Đăng nhập", d: "Sử dụng tài khoản Moodle của trường để vào hệ thống." },
      { t: "Chọn khóa học", d: "Truy cập các khóa học bạn đã ghi danh và bắt đầu học." },
      { t: "Theo dõi tiến độ", d: "Xem điểm, tiến độ và thông báo ở một nơi duy nhất." },
    ],
    philosophyTitle: "Triết lý giáo dục",
    philosophyWords: "Thực chất · Đổi mới · Hội nhập",
    values: [
      "Tri thức và đạo đức nghề nghiệp",
      "Sáng tạo và đam mê",
      "Tôn trọng khác biệt, hợp tác",
      "Chất lượng, hiệu quả, bền vững",
    ],
    ctaTitle: "Sẵn sàng bắt đầu hành trình học tập?",
    ctaSubtitle: "Đăng nhập để truy cập khóa học, bài kiểm tra và điểm số của bạn.",
    footerAbout:
      "Hệ thống E‑Learning của Trường Đại học Tài chính – Marketing.",
    quickLinks: "Liên kết",
    contactLabel: "Liên hệ",
  },
  en: {
    nav: { features: "Features", programs: "Programs", contact: "Contact" },
    login: "Log in",
    enterPortal: "Enter portal",
    explore: "Explore features",
    heroBadge: brand.name,
    heroTitle: "The online learning platform",
    heroAccent: "of UFM",
    heroSubtitle:
      "SCORM lessons, quizzes, grades and conversations with your teachers — all in one modern E‑Learning system.",
    stats: [
      { n: "50+", l: "Courses" },
      { n: "5", l: "Programs" },
      { n: "SCORM", l: "Interactive lessons" },
      { n: "VI / EN", l: "Bilingual" },
    ],
    featuresTitle: "Everything you need to learn",
    featuresSubtitle:
      "A clean learning portal wired directly into the university's Moodle.",
    features: [
      { icon: PlayCircle, t: "SCORM lessons", d: "Take interactive lessons right in your browser." },
      { icon: ClipboardCheck, t: "Quizzes & tests", d: "Attempt assessments and see results per course." },
      { icon: Award, t: "Grades", d: "Track your scores and progress in real time." },
      { icon: MessagesSquare, t: "Messages & forum", d: "Talk directly with teachers and classmates." },
      { icon: Bell, t: "Notifications", d: "Never miss a deadline or important announcement." },
      { icon: MonitorSmartphone, t: "Cross‑platform", d: "A smooth experience on desktop and mobile." },
    ],
    programsTitle: "Academic programs",
    programsSubtitle: "Application‑oriented programs meeting national and international standards.",
    programs: [
      { icon: Calculator, t: "Accounting", d: "Financial, management, cost and tax accounting." },
      { icon: Briefcase, t: "Business Administration", d: "Organizational behavior, strategy and operations." },
      { icon: Landmark, t: "Corporate Finance", d: "Financial markets and corporate planning." },
      { icon: Languages, t: "Business English", d: "Language skills for modern business." },
      { icon: Gavel, t: "Business & Investment Law", d: "Economic law and investment knowledge." },
    ],
    howEyebrow: "How it works",
    howTitle: "Get started in 3 steps",
    how: [
      { t: "Log in", d: "Use your university Moodle account to sign in." },
      { t: "Pick a course", d: "Open the courses you're enrolled in and start learning." },
      { t: "Track progress", d: "See grades, progress and notifications in one place." },
    ],
    philosophyTitle: "Educational philosophy",
    philosophyWords: "Substance · Innovation · Integration",
    values: [
      "Knowledge and professional ethics",
      "Creativity and passion",
      "Respect for differences, collaboration",
      "Quality, efficiency, sustainability",
    ],
    ctaTitle: "Ready to start your learning journey?",
    ctaSubtitle: "Log in to access your courses, quizzes and grades.",
    footerAbout: "The E‑Learning system of the University of Finance – Marketing.",
    quickLinks: "Links",
    contactLabel: "Contact",
  },
} as const;

export default async function LandingPage() {
  const [token, locale, user] = await Promise.all([getToken(), getLocale(), getSessionUser()]);
  const c = COPY[locale];
  const ctaHref = token ? "/dashboard" : "/login";
  const ctaLabel = token ? c.enterPortal : c.login;
  const year = new Date().getFullYear();

  const navLink =
    "text-sm text-muted transition-colors hover:text-fg";

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <LogoChip />
            <span className="truncate text-base font-semibold text-fg">{brand.tagline}</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#features" className={navLink}>
              {c.nav.features}
            </a>
            <a href="#programs" className={navLink}>
              {c.nav.programs}
            </a>
            <a href="#contact" className={navLink}>
              {c.nav.contact}
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LangSwitcher />
            {token && user ? (
              <Link
                href="/dashboard"
                title={c.enterPortal}
                className="flex h-10 max-w-[220px] items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition-colors hover:bg-surface-2"
              >
                <UserAvatar name={user.fullname} id={user.id} src={user.pictureurl} size={32} />
                <span className="truncate text-sm font-medium text-fg">{user.fullname}</span>
              </Link>
            ) : (
              <Button href={ctaHref} size="sm">
                {ctaLabel}
                <ArrowRight size={14} strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-mesh relative overflow-hidden border-b border-line">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {c.heroBadge}
            </span>
            <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-fg sm:text-5xl lg:mx-0 lg:text-6xl">
              {c.heroTitle} <span className="text-gradient">{c.heroAccent}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0">
              {c.heroSubtitle}
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Button href={ctaHref} size="lg">
                {ctaLabel}
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
              <Button href="#features" variant="secondary" size="lg">
                {c.explore}
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-primary/20 via-accent/15 to-violet/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
              <Image
                src={heroPhoto}
                alt=""
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 560px, 100vw"
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            </div>
            {/* Floating stat chips */}
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur sm:left-6">
              <IconTile icon={PlayCircle} tone="primary" size="sm" />
              <div className="leading-tight">
                <p className="text-sm font-semibold tabular-nums text-fg">{c.stats[0].n}</p>
                <p className="text-xs text-subtle">{c.stats[0].l}</p>
              </div>
            </div>
            <div className="absolute -top-4 right-4 hidden items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur sm:flex">
              <IconTile icon={Award} tone="success" size="sm" />
              <div className="leading-tight">
                <p className="text-sm font-semibold tabular-nums text-fg">{c.stats[1].n}</p>
                <p className="text-xs text-subtle">{c.stats[1].l}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {c.stats.map((s) => (
              <div key={s.l} className="bg-surface/90 px-4 py-6 text-center backdrop-blur">
                <dt className="sr-only">{s.l}</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums text-fg sm:text-3xl">
                  {s.n}
                </dd>
                <dd className="mt-1 text-[13px] text-subtle">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow={c.nav.features}
            title={c.featuresTitle}
            subtitle={c.featuresSubtitle}
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f, i) => (
              <Card key={f.t} interactive className="p-6">
                <IconSquare icon={f.icon} index={i} />
                <h3 className="mt-5 text-base font-semibold text-fg">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section
        id="programs"
        className="scroll-mt-16 border-y border-line bg-surface-2 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow={c.nav.programs}
            title={c.programsTitle}
            subtitle={c.programsSubtitle}
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.programs.map((p, i) => (
              <Card key={p.t} interactive className="flex items-start gap-4 p-5">
                <IconSquare icon={p.icon} index={i + 1} />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-fg">{p.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{p.d}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow={c.howEyebrow} title={c.howTitle} />
          <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {c.how.map((s, i) => (
              <li key={s.t} className="rounded-xl border border-line bg-surface p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-[13px] font-semibold tabular-nums text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-base font-semibold text-fg">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Philosophy */}
      <section className="border-y border-line bg-surface-2 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow={c.philosophyTitle} title={c.philosophyWords} />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.values.map((v) => (
              <li
                key={v}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface p-5"
              >
                <BadgeCheck
                  size={18}
                  strokeWidth={1.75}
                  className="mt-px shrink-0 text-primary-text"
                />
                <span className="text-sm font-medium text-fg">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <Image
              src={graduationPhoto}
              alt=""
              fill
              placeholder="blur"
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
            />
            <div className="bg-photo-overlay absolute inset-0" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {c.ctaTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                {c.ctaSubtitle}
              </p>
              <Link
                href={ctaHref}
                className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-[#14468c] transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {ctaLabel}
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 text-sm text-muted sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoChip size={44} />
              <span className="text-sm font-semibold text-fg">{brand.tagline}</span>
            </div>
            <p className="mt-4 max-w-xs leading-relaxed">{c.footerAbout}</p>
            <div className="mt-5 flex gap-2">
              <a
                href="https://facebook.com/ufm.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={buttonClass("secondary", "icon")}
              >
                <Globe size={16} strokeWidth={1.75} />
              </a>
              <a
                href="https://lms-ufm.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={brand.contact.website}
                className={buttonClass("secondary", "icon")}
              >
                <Languages size={16} strokeWidth={1.75} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-fg">{c.quickLinks}</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="#features" className="transition-colors hover:text-fg">
                  {c.nav.features}
                </a>
              </li>
              <li>
                <a href="#programs" className="transition-colors hover:text-fg">
                  {c.nav.programs}
                </a>
              </li>
              <li>
                <Link href={ctaHref} className="transition-colors hover:text-fg">
                  {ctaLabel}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-semibold text-fg">{c.contactLabel}</h4>
            <ul className="mt-4 space-y-2.5">
              <li className="flex items-start gap-2">
                <MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-subtle" />
                <span>{brand.contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} strokeWidth={1.75} className="shrink-0 text-subtle" />
                <a
                  href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}
                  className="tabular-nums transition-colors hover:text-fg"
                >
                  {brand.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} strokeWidth={1.75} className="shrink-0 text-subtle" />
                <a
                  href={`mailto:${brand.contact.email}`}
                  className="break-all transition-colors hover:text-fg"
                >
                  {brand.contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-subtle sm:px-6">
            © {year} {brand.name}.
          </div>
        </div>
      </footer>
    </div>
  );
}

function LogoChip({ size = 40 }: { size?: number }) {
  return (
    <Image
      src={brand.logoMark}
      alt={brand.name}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

const TILE_TONES: Tone[] = ["primary", "accent", "violet", "success", "warning", "primary"];

function IconSquare({ icon, index = 0 }: { icon: LucideIcon; index?: number }) {
  return <IconTile icon={icon} tone={TILE_TONES[index % TILE_TONES.length]} />;
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-[13px] font-medium text-primary-text">{eyebrow}</p>
      )}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-base leading-relaxed text-muted">{subtitle}</p>
      )}
    </div>
  );
}
