"use client";
import { useState } from "react";
import { Modal } from "antd";
import {
  Download,
  Eye,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui";
import { fileUrl } from "@/lib/moodle/files";
import type { MoodleFile } from "@/lib/moodle/types";
import { formatBytes } from "./lib";

type PreviewKind = "image" | "pdf" | "video" | null;

function previewKind(f: MoodleFile): PreviewKind {
  const mime = f.mimetype ?? "";
  const ext = f.filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("video/") || ["mp4", "webm", "ogg", "mov"].includes(ext)) return "video";
  return null;
}

function fileIcon(f: MoodleFile): LucideIcon {
  const mime = f.mimetype ?? "";
  const kind = previewKind(f);
  if (kind === "image") return FileImage;
  if (kind === "video") return FileVideo;
  if (kind === "pdf" || mime.startsWith("text/") || /word|document|rtf/.test(mime)) return FileText;
  if (/sheet|excel|csv/.test(mime)) return FileSpreadsheet;
  if (/zip|compressed|tar|rar|7z/.test(mime)) return FileArchive;
  return FileIcon;
}

/** Submitted files with size, inline preview (image/pdf/video) and download. */
export function FileList({ files }: { files: MoodleFile[] }) {
  const t = useT();
  const [preview, setPreview] = useState<MoodleFile | null>(null);
  const kind = preview ? previewKind(preview) : null;

  return (
    <>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {files.map((f) => {
          const Icon = fileIcon(f);
          return (
            <li key={f.fileurl} className="flex items-center gap-3 px-3 py-2.5">
              <Icon size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg" title={f.filename}>
                  {f.filename}
                </p>
                {!!f.filesize && (
                  <p className="text-xs tabular-nums text-subtle">{formatBytes(f.filesize)}</p>
                )}
              </div>
              {previewKind(f) && (
                <Button variant="ghost" size="sm" onClick={() => setPreview(f)}>
                  <Eye size={16} strokeWidth={1.75} />
                  <span className="hidden sm:inline">{t("grading.view")}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                href={fileUrl(f.fileurl, { download: true })}
                external
                aria-label={t("grading.download")}
              >
                <Download size={16} strokeWidth={1.75} />
              </Button>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        title={preview?.filename}
        width={kind === "pdf" ? 1000 : 860}
        centered
        destroyOnHidden
      >
        {preview && kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl(preview.fileurl)}
            alt={preview.filename}
            className="mx-auto max-h-[75vh] max-w-full object-contain"
          />
        )}
        {preview && kind === "pdf" && (
          <iframe
            src={fileUrl(preview.fileurl)}
            title={preview.filename}
            className="h-[75vh] w-full rounded-lg border border-line"
          />
        )}
        {preview && kind === "video" && (
          <video src={fileUrl(preview.fileurl)} controls className="max-h-[75vh] w-full rounded-lg" />
        )}
      </Modal>
    </>
  );
}
