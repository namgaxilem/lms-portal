"use client";
import { Download, Eye, FileText, Image as ImageIcon } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/components/ui";
import { fileUrl } from "@/lib/moodle/files";
import type { MoodleFile } from "@/lib/moodle/types";
import { formatBytes, isImage, isPreviewable } from "./lib";

/** Read-only list of Moodle files with preview (image/PDF) and download links. */
export function FileList({ files, className }: { files: MoodleFile[]; className?: string }) {
  const t = useT();
  if (!files.length) return null;
  return (
    <ul className={cn("divide-y divide-line rounded-lg border border-line", className)}>
      {files.map((f) => {
        const Icon = isImage(f) ? ImageIcon : FileText;
        return (
          <li key={f.fileurl} className="flex items-center gap-3 px-3 py-2.5">
            <Icon size={18} strokeWidth={1.75} className="shrink-0 text-subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg" title={f.filename}>
                {f.filename}
              </p>
              {f.filesize !== undefined && (
                <p className="text-xs text-subtle">{formatBytes(f.filesize)}</p>
              )}
            </div>
            {isPreviewable(f) && (
              <a
                href={fileUrl(f.fileurl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                aria-label={t("assignment.preview")}
                title={t("assignment.preview")}
              >
                <Eye size={16} strokeWidth={1.75} />
              </a>
            )}
            <a
              href={fileUrl(f.fileurl, { download: true })}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              aria-label={t("assignment.download")}
              title={t("assignment.download")}
            >
              <Download size={16} strokeWidth={1.75} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
