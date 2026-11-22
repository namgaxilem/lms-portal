import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  Archive,
  Award,
  Bell,
  BookOpenCheck,
  CalendarClock,
  GraduationCap,
  Info,
  KeyRound,
  Lightbulb,
  ShieldCheck,
  Target,
  TriangleAlert,
  Trophy,
  UserPlus,
} from "lucide-react";
import type { Tone } from "@/components/ui";
import { moduleMeta } from "@/lib/module-meta";
import type { PopupNotification } from "@/lib/moodle/types";

interface NotificationMeta {
  icon: LucideIcon;
  tone: Tone;
  /** i18n key of the short category label ("Quiz", "Course completed"…). */
  labelKey: string;
}

const kind = (icon: LucideIcon, tone: Tone, key: string): NotificationMeta => ({
  icon,
  tone,
  labelKey: `notifications.kind.${key}`,
});

const COURSE = kind(BookOpenCheck, "accent", "course");
const BADGE = kind(Award, "warning", "badge");
const COMPETENCY = kind(Target, "violet", "competency");
const BACKUP = kind(Archive, "neutral", "system");
const GENERAL = kind(Bell, "primary", "general");

/** Core message providers (component "moodle"), by eventtype — see lib/db/messages.php. */
const CORE: Record<string, NotificationMeta> = {
  coursecompleted: kind(Trophy, "success", "completion"),
  gradenotifications: kind(GraduationCap, "violet", "grade"),
  coursecontentupdated: COURSE,
  courserequested: COURSE,
  courserequestapproved: COURSE,
  courserequestrejected: COURSE,
  badgerecipientnotice: BADGE,
  badgecreatornotice: BADGE,
  messagecontactrequests: kind(UserPlus, "accent", "contact"),
  newlogin: kind(KeyRound, "danger", "security"),
  insights: kind(Lightbulb, "warning", "insight"),
  competencyplancomment: COMPETENCY,
  competencyusercompcomment: COMPETENCY,
  backup: BACKUP,
  asyncbackupnotification: BACKUP,
  notices: kind(Info, "neutral", "system"),
  errors: kind(TriangleAlert, "danger", "system"),
};

/**
 * Icon, colour and category label for a notification, derived from Moodle's
 * `component` (mod_quiz, moodle, enrol_self…) and `eventtype` (the message
 * provider name). Activity notifications reuse the activity-type colours.
 */
export function notificationMeta(n: Pick<PopupNotification, "component" | "eventtype">): NotificationMeta {
  const component = n.component ?? "";
  const event = n.eventtype ?? "";

  if (component.startsWith("mod_")) {
    const mod = moduleMeta(component.slice(4));
    if (event === "attempt_overdue") return { ...mod, icon: AlarmClock, tone: "warning" };
    return mod;
  }
  if (component === "moodle") return CORE[event] ?? GENERAL;
  if (component.startsWith("enrol_")) return kind(CalendarClock, "warning", "enrolment");
  if (component === "tool_dataprivacy") return kind(ShieldCheck, "neutral", "privacy");
  return GENERAL;
}

/** Text colour matching a tone, for small category labels. */
export const toneText: Record<Tone, string> = {
  neutral: "text-muted",
  primary: "text-primary-text",
  accent: "text-accent",
  violet: "text-violet",
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-error-text",
};
