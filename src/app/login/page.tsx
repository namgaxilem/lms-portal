import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { getMoodlePublicConfig, type MoodlePublicConfig } from "@/lib/moodle/public-config.server";
import { moodleBase } from "@/lib/public-config";
import { hasRichContent } from "@/lib/format";
import { LoginView } from "./_components/LoginView";
import type { LoginSiteSettings } from "./types";

/** The admin's custom reset URL (http(s) or mailto:) when set, else Moodle's own page. */
function forgotPasswordUrl(custom: string | undefined): string | null {
  if (custom && /^(?:https?:\/\/|mailto:)/i.test(custom)) return custom;
  const base = moodleBase();
  return base ? `${base}/login/forgot_password.php` : null;
}

/** Login page settings from Moodle's public config; sensible defaults when Moodle is unreachable. */
function siteSettings(config: MoodlePublicConfig | null): LoginSiteSettings {
  return {
    forgotPasswordUrl: forgotPasswordUrl(config?.forgottenpasswordurl),
    loginViaEmail: config?.authloginviaemail ?? false,
    maintenance: config?.maintenanceenabled ? { message: config.maintenancemessage } : null,
    instructions: hasRichContent(config?.authinstructions) ? config.authinstructions : null,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  // Shown as "{title} | {school}" through the root layout's title template.
  const t = await getT();
  return { title: t("auth.signIn") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ expired }, config] = await Promise.all([searchParams, getMoodlePublicConfig()]);
  return (
    <LoginView sessionExpired={expired === "1"} settings={siteSettings(config)} year={new Date().getFullYear()} />
  );
}
