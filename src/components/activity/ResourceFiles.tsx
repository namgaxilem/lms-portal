"use client";
import { Download, ExternalLink } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { fileKind, fileUrl, formatFileSize, type FileKind } from "@/lib/moodle/files";
import type { MoodleFile } from "@/lib/moodle/types";
import { Button, Card } from "@/components/ui";
import { FileTypeTile } from "@/components/FileTypeTile";

/** Formats every browser plays or shows inline (others only get the file row). */
const PREVIEWABLE: Partial<Record<FileKind, (mime: string) => boolean>> = {
  pdf: () => true,
  image: (mime) => /^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/.test(mime),
  video: (mime) => /^video\/(mp4|webm|ogg)$/.test(mime),
  audio: (mime) => /^audio\/(mpeg|mp3|mp4|aac|ogg|wav|x-wav|webm)$/.test(mime),
};

/** File name, friendly type and size, with Open (new tab) and Download. */
export function FileRow({ file, main = false }: { file: MoodleFile; main?: boolean }) {
  const t = useT();
  const { locale } = useLocale();
  const kind = fileKind(file);
  const details = [t(`activity.fileType.${kind}`), formatFileSize(file.filesize, locale)].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <FileTypeTile file={file} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-fg" title={file.filename}>
            {file.filename}
          </p>
          <p className="truncate text-[13px] text-subtle">{details}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" href={fileUrl(file.fileurl)} external className="flex-1 sm:flex-none">
          {t("activity.openFile")}
          <ExternalLink size={16} strokeWidth={2} aria-hidden />
        </Button>
        <Button
          variant={main ? "gradient" : "primary"}
          href={fileUrl(file.fileurl, { download: true })}
          external
          download={file.filename}
          className="flex-1 sm:flex-none"
        >
          <Download size={16} strokeWidth={2} aria-hidden />
          {t("activity.download")}
        </Button>
      </div>
    </div>
  );
}

function Preview({ file }: { file: MoodleFile }) {
  const kind = fileKind(file);
  const canPreview = PREVIEWABLE[kind];
  if (!canPreview?.((file.mimetype ?? "").toLowerCase())) return null;
  const src = fileUrl(file.fileurl);

  switch (kind) {
    case "pdf":
      // The proxy serves PDFs unsandboxed so the browser's viewer can render them.
      return <iframe src={src} title={file.filename} className="block h-[75vh] w-full bg-surface-2" />;
    case "image":
      return (
        <div className="grid place-items-center bg-surface-2 p-3 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- proxied Moodle file, size unknown */}
          <img src={src} alt={file.filename} className="max-h-[75vh] w-auto rounded-control" />
        </div>
      );
    case "video":
      // Black letterbox is the media convention in both themes.
      return <video src={src} controls preload="metadata" className="block max-h-[75vh] w-full bg-black" />;
    case "audio":
      return (
        <div className="bg-surface-2 p-5">
          <audio src={src} controls preload="metadata" className="w-full" />
        </div>
      );
    default:
      return null;
  }
}

/** The resource's main file: inline preview when the browser can show it, then its file row. */
export function MainFile({ file }: { file: MoodleFile }) {
  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <Preview file={file} />
      <div className="border-t border-line first:border-t-0">
        <FileRow file={file} main />
      </div>
    </Card>
  );
}
