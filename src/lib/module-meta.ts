import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/Badge";
import {
  Blocks,
  ClipboardCheck,
  FileQuestion,
  FileText,
  Link2,
  MessagesSquare,
  MessageSquareHeart,
  Newspaper,
  PlayCircle,
} from "lucide-react";

interface ModuleMeta {
  /** i18n key under `modules.*`; unknown types fall back to the raw modname. */
  labelKey: string;
  icon: LucideIcon;
  /** IconTile color, so module types are recognizable at a glance. */
  tone: Tone;
}

const MAP: Record<string, ModuleMeta> = {
  scorm: { labelKey: "modules.scorm", icon: PlayCircle, tone: "primary" },
  quiz: { labelKey: "modules.quiz", icon: FileQuestion, tone: "violet" },
  assign: { labelKey: "modules.assign", icon: ClipboardCheck, tone: "warning" },
  resource: { labelKey: "modules.resource", icon: FileText, tone: "accent" },
  url: { labelKey: "modules.url", icon: Link2, tone: "accent" },
  page: { labelKey: "modules.page", icon: Newspaper, tone: "neutral" },
  forum: { labelKey: "modules.forum", icon: MessagesSquare, tone: "success" },
  feedback: { labelKey: "modules.feedback", icon: MessageSquareHeart, tone: "violet" },
};

export function moduleMeta(modname: string): ModuleMeta {
  return MAP[modname] ?? { labelKey: modname, icon: Blocks, tone: "neutral" };
}
