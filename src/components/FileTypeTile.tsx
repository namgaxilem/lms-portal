import type { LucideIcon } from "lucide-react";
import {
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideoCamera,
  Presentation,
} from "lucide-react";
import { IconTile, type Tone } from "@/components/ui";
import { fileKind, type FileKind } from "@/lib/moodle/files";

/** Icon and categorical colour per file family, the same in every file list. */
const LOOK: Record<FileKind, { icon: LucideIcon; tone: Tone }> = {
  pdf: { icon: FileText, tone: "danger" },
  word: { icon: FileText, tone: "accent" },
  spreadsheet: { icon: FileSpreadsheet, tone: "success" },
  presentation: { icon: Presentation, tone: "warning" },
  image: { icon: FileImage, tone: "violet" },
  video: { icon: FileVideoCamera, tone: "violet" },
  audio: { icon: FileAudio, tone: "violet" },
  archive: { icon: FileArchive, tone: "neutral" },
  text: { icon: FileText, tone: "neutral" },
  other: { icon: File, tone: "neutral" },
};

/** Coloured tile showing a file's type, so files are recognisable at a glance. */
export function FileTypeTile({
  file,
  size = "md",
}: {
  file: { filename: string; mimetype?: string | null };
  size?: "sm" | "md";
}) {
  const { icon, tone } = LOOK[fileKind(file)];
  return <IconTile icon={icon} tone={tone} size={size} />;
}
