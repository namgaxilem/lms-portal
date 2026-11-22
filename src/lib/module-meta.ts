import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/Badge";
import {
  BookOpen,
  Blocks,
  ClipboardCheck,
  Database,
  FileQuestion,
  FileText,
  Folder,
  FolderTree,
  GraduationCap,
  Link2,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  MessageSquareHeart,
  Newspaper,
  PlayCircle,
  Puzzle,
  SquareLibrary,
  Type,
  Users,
  Video,
  Vote,
} from "lucide-react";

interface ModuleMeta {
  /** i18n key under `modules.*` (unknown types → `modules.other`). */
  labelKey: string;
  icon: LucideIcon;
  /** IconTile / Badge tone, so module types are recognisable at a glance. */
  tone: Tone;
}

const MAP: Record<string, ModuleMeta> = {
  scorm: { labelKey: "modules.scorm", icon: PlayCircle, tone: "primary" },
  h5pactivity: { labelKey: "modules.h5pactivity", icon: Puzzle, tone: "primary" },
  hvp: { labelKey: "modules.hvp", icon: Puzzle, tone: "primary" },
  imscp: { labelKey: "modules.imscp", icon: SquareLibrary, tone: "primary" },
  lesson: { labelKey: "modules.lesson", icon: GraduationCap, tone: "primary" },
  quiz: { labelKey: "modules.quiz", icon: FileQuestion, tone: "violet" },
  feedback: { labelKey: "modules.feedback", icon: MessageSquareHeart, tone: "violet" },
  survey: { labelKey: "modules.survey", icon: ListChecks, tone: "violet" },
  choice: { labelKey: "modules.choice", icon: Vote, tone: "violet" },
  assign: { labelKey: "modules.assign", icon: ClipboardCheck, tone: "warning" },
  workshop: { labelKey: "modules.workshop", icon: Users, tone: "warning" },
  resource: { labelKey: "modules.resource", icon: FileText, tone: "accent" },
  folder: { labelKey: "modules.folder", icon: Folder, tone: "accent" },
  url: { labelKey: "modules.url", icon: Link2, tone: "accent" },
  lti: { labelKey: "modules.lti", icon: Link2, tone: "accent" },
  page: { labelKey: "modules.page", icon: Newspaper, tone: "neutral" },
  book: { labelKey: "modules.book", icon: BookOpen, tone: "neutral" },
  label: { labelKey: "modules.label", icon: Type, tone: "neutral" },
  subsection: { labelKey: "modules.subsection", icon: FolderTree, tone: "neutral" },
  glossary: { labelKey: "modules.glossary", icon: SquareLibrary, tone: "neutral" },
  data: { labelKey: "modules.data", icon: Database, tone: "neutral" },
  wiki: { labelKey: "modules.wiki", icon: BookOpen, tone: "neutral" },
  forum: { labelKey: "modules.forum", icon: MessagesSquare, tone: "success" },
  hsuforum: { labelKey: "modules.hsuforum", icon: MessagesSquare, tone: "success" },
  chat: { labelKey: "modules.chat", icon: MessageCircle, tone: "success" },
  bigbluebuttonbn: { labelKey: "modules.bigbluebuttonbn", icon: Video, tone: "success" },
};

const OTHER: ModuleMeta = { labelKey: "modules.other", icon: Blocks, tone: "neutral" };

export function moduleMeta(modname: string): ModuleMeta {
  return MAP[modname] ?? OTHER;
}
