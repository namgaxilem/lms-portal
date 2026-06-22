import Image from "next/image";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { getLocale } from "@/i18n/server";
import { MaterialIcon } from "@/components/MaterialIcon";
import { LangSwitcher } from "@/components/LangSwitcher";
import { brand } from "@/config/brand";

/**
 * Public marketing landing at "/". Server component: reads the auth cookie to
 * point the CTA at the dashboard (logged in) or login, and the locale cookie to
 * pick copy. Content is UFM's; the layout/structure is a clean SaaS-style page
 * built on the app's own Material 3 design tokens.
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
      { icon: "play_circle", t: "Bài giảng SCORM", d: "Học các bài giảng tương tác ngay trong trình duyệt." },
      { icon: "quiz", t: "Trắc nghiệm & Bài kiểm tra", d: "Làm bài và xem kết quả theo từng khóa học." },
      { icon: "workspace_premium", t: "Bảng điểm", d: "Theo dõi điểm số và tiến độ của bạn theo thời gian thực." },
      { icon: "forum", t: "Tin nhắn & Diễn đàn", d: "Trao đổi trực tiếp với giảng viên và bạn học." },
      { icon: "notifications", t: "Thông báo", d: "Không bỏ lỡ hạn nộp bài hay thông báo quan trọng." },
      { icon: "devices", t: "Đa nền tảng", d: "Trải nghiệm mượt mà trên máy tính và điện thoại." },
    ],
    programsTitle: "Các chuyên ngành đào tạo",
    programsSubtitle: "Chương trình ứng dụng, đạt chuẩn quốc gia và quốc tế.",
    programs: [
      { icon: "calculate", t: "Kế toán", d: "Kế toán tài chính, quản trị, chi phí và thuế." },
      { icon: "business_center", t: "Quản trị kinh doanh", d: "Hành vi tổ chức, chiến lược và vận hành." },
      { icon: "account_balance", t: "Tài chính doanh nghiệp", d: "Thị trường tài chính và hoạch định tài chính." },
      { icon: "translate", t: "Tiếng Anh kinh doanh", d: "Kỹ năng ngôn ngữ cho môi trường kinh doanh." },
      { icon: "gavel", t: "Luật kinh doanh & đầu tư", d: "Kiến thức pháp luật kinh tế và đầu tư." },
    ],
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
      { icon: "play_circle", t: "SCORM lessons", d: "Take interactive lessons right in your browser." },
      { icon: "quiz", t: "Quizzes & tests", d: "Attempt assessments and see results per course." },
      { icon: "workspace_premium", t: "Grades", d: "Track your scores and progress in real time." },
      { icon: "forum", t: "Messages & forum", d: "Talk directly with teachers and classmates." },
      { icon: "notifications", t: "Notifications", d: "Never miss a deadline or important announcement." },
      { icon: "devices", t: "Cross‑platform", d: "A smooth experience on desktop and mobile." },
    ],
    programsTitle: "Academic programs",
    programsSubtitle: "Application‑oriented programs meeting national and international standards.",
    programs: [
      { icon: "calculate", t: "Accounting", d: "Financial, management, cost and tax accounting." },
      { icon: "business_center", t: "Business Administration", d: "Organizational behavior, strategy and operations." },
      { icon: "account_balance", t: "Corporate Finance", d: "Financial markets and corporate planning." },
      { icon: "translate", t: "Business English", d: "Language skills for modern business." },
      { icon: "gavel", t: "Business & Investment Law", d: "Economic law and investment knowledge." },
    ],
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
  const [token, locale] = await Promise.all([getToken(), getLocale()]);
  const c = COPY[locale];
  const ctaHref = token ? "/dashboard" : "/login";
  const ctaLabel = token ? c.enterPortal : c.login;
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-outline-variant/15 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-outline-variant/20">
              <Image
                src="/images/main-logo.png"
                alt={brand.name}
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="font-headline-sm text-headline-sm font-extrabold tracking-tight text-primary">
              {brand.tagline}
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="font-body-sm text-body-sm font-semibold text-on-surface-variant transition-colors hover:text-primary">
              {c.nav.features}
            </a>
            <a href="#programs" className="font-body-sm text-body-sm font-semibold text-on-surface-variant transition-colors hover:text-primary">
              {c.nav.programs}
            </a>
            <a href="#contact" className="font-body-sm text-body-sm font-semibold text-on-surface-variant transition-colors hover:text-primary">
              {c.nav.contact}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <LangSwitcher />
            <Link
              href={ctaHref}
              className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 font-label-md text-label-md font-bold text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              {ctaLabel}
              <MaterialIcon name="arrow_forward" className="!text-base" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-tertiary text-on-primary">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-secondary/25 blur-3xl animate-float" />
        <div
          className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-inverse-primary/20 blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
          <span className="mb-6 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-label-md text-label-md backdrop-blur-sm">
            {c.heroBadge}
          </span>
          <h1 className="mx-auto max-w-4xl font-display-lg-mobile text-display-lg-mobile leading-tight md:font-display-lg md:text-display-lg">
            {c.heroTitle}{" "}
            <span className="text-secondary-fixed">{c.heroAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body-lg text-body-lg text-primary-fixed/80">
            {c.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={ctaHref}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-headline-sm text-headline-sm font-bold text-primary shadow-lg transition-all hover:bg-white/90 active:scale-95 sm:w-auto"
            >
              {ctaLabel}
              <MaterialIcon name="arrow_forward" />
            </Link>
            <a
              href="#features"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 font-headline-sm text-headline-sm font-bold text-on-primary backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95 sm:w-auto"
            >
              {c.explore}
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {c.stats.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md"
              >
                <div className="font-display-lg text-3xl font-extrabold text-secondary-fixed">
                  {s.n}
                </div>
                <div className="mt-1 font-label-md text-label-md text-primary-fixed/80">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={c.featuresTitle} subtitle={c.featuresSubtitle} />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f) => (
              <div
                key={f.t}
                className="group rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-7 card-elevation transition-all hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                  <MaterialIcon name={f.icon} className="!text-2xl" />
                </div>
                <h3 className="mt-5 font-headline-sm text-headline-sm text-on-surface">
                  {f.t}
                </h3>
                <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="scroll-mt-20 bg-surface-container-low/40 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={c.programsTitle} subtitle={c.programsSubtitle} />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {c.programs.map((p) => (
              <div
                key={p.t}
                className="flex items-start gap-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-6 card-elevation transition-all hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                  <MaterialIcon name={p.icon} className="!text-2xl" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    {p.t}
                  </h3>
                  <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    {p.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={c.howTitle} />
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {c.how.map((s, i) => (
              <div key={s.t} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-display-lg text-2xl font-extrabold text-on-primary shadow-lg shadow-primary/20">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-6 font-headline-sm text-headline-sm text-on-surface">
                  {s.t}
                </h3>
                <p className="mx-auto mt-2 max-w-xs font-body-md text-body-md text-on-surface-variant">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="bg-surface-container-low/40 py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-label-md text-label-md uppercase tracking-widest text-primary">
            {c.philosophyTitle}
          </p>
          <h2 className="mt-4 font-display-lg-mobile text-display-lg-mobile text-on-surface">
            {c.philosophyWords}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.values.map((v) => (
              <div
                key={v}
                className="flex items-center gap-3 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 text-left card-elevation"
              >
                <MaterialIcon name="verified" fill className="!text-xl text-secondary" />
                <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-tertiary px-6 py-16 text-center text-on-primary shadow-xl">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative font-display-lg-mobile text-display-lg-mobile">
              {c.ctaTitle}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl font-body-lg text-body-lg text-primary-fixed/80">
              {c.ctaSubtitle}
            </p>
            <Link
              href={ctaHref}
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-headline-sm text-headline-sm font-bold text-primary shadow-lg transition-all hover:bg-white/90 active:scale-95"
            >
              {ctaLabel}
              <MaterialIcon name="arrow_forward" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="scroll-mt-20 border-t border-outline-variant/15 bg-surface-container-low/60">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-outline-variant/20">
                <Image
                  src="/images/main-logo.png"
                  alt={brand.name}
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="font-headline-sm text-headline-sm font-extrabold text-primary">
                {brand.tagline}
              </span>
            </div>
            <p className="mt-4 max-w-xs font-body-md text-body-md text-on-surface-variant">
              {c.footerAbout}
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://facebook.com/ufm.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary"
              >
                <MaterialIcon name="public" />
              </a>
              <a
                href="https://lms-ufm.edu.vn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={brand.contact.website}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-primary hover:text-on-primary"
              >
                <MaterialIcon name="language" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-wider text-on-surface">
              {c.quickLinks}
            </h4>
            <ul className="mt-4 space-y-3 font-body-md text-body-md text-on-surface-variant">
              <li>
                <a href="#features" className="transition-colors hover:text-primary">
                  {c.nav.features}
                </a>
              </li>
              <li>
                <a href="#programs" className="transition-colors hover:text-primary">
                  {c.nav.programs}
                </a>
              </li>
              <li>
                <Link href={ctaHref} className="transition-colors hover:text-primary">
                  {ctaLabel}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-label-md text-label-md uppercase tracking-wider text-on-surface">
              {c.contactLabel}
            </h4>
            <ul className="mt-4 space-y-3 font-body-md text-body-md text-on-surface-variant">
              <li className="flex items-start gap-2">
                <MaterialIcon name="location_on" className="!text-lg text-primary" />
                <span>{brand.contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon name="call" className="!text-lg text-primary" />
                <a href={`tel:${brand.contact.phone.replace(/\s/g, "")}`} className="transition-colors hover:text-primary">
                  {brand.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MaterialIcon name="mail" className="!text-lg text-primary" />
                <a href={`mailto:${brand.contact.email}`} className="transition-colors hover:text-primary">
                  {brand.contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-outline-variant/15 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
          © {year} {brand.name}.
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 font-body-lg text-body-lg text-on-surface-variant">
          {subtitle}
        </p>
      )}
    </div>
  );
}
