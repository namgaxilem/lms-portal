"use client";
import { useState, type ReactNode } from "react";
import { Modal } from "antd";
import { Download, Eye, Trash2 } from "lucide-react";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { Button, buttonClass, cn } from "@/components/ui";
import { FileTypeTile } from "@/components/FileTypeTile";
import { fileKind, fileUrl, formatFileSize } from "@/lib/moodle/files";
import type { MoodleFile } from "@/lib/moodle/types";

type PreviewKind = "image" | "pdf" | "video";

/** Files the preview dialog can show. */
function previewKind(f: Pick<MoodleFile, "filename" | "mimetype">): PreviewKind | null {
  const kind = fileKind(f);
  return kind === "image" || kind === "pdf" || kind === "video" ? kind : null;
}

/** One file row: type tile, name and size, then the row's actions (`children`). */
export function FileRow({
  name,
  size,
  mimetype,
  children,
}: {
  name: string;
  size?: number;
  mimetype?: string;
  children?: ReactNode;
}) {
  const { locale } = useLocale();
  const formatted = formatFileSize(size, locale);
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2.5 pr-2">
      <FileTypeTile file={{ filename: name, mimetype }} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg" title={name}>
          {name}
        </p>
        {formatted && <p className="text-xs tabular-nums text-subtle">{formatted}</p>}
      </div>
      {children}
    </li>
  );
}

/**
 * Moodle files (submissions, feedback, instructions) for students and graders
 * alike: preview in a dialog (image, PDF, video), download, and an optional
 * remove action.
 */
export function FileList({
  files,
  onRemove,
  disabled,
  className,
}: {
  files: MoodleFile[];
  onRemove?: (file: MoodleFile) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const [preview, setPreview] = useState<MoodleFile | null>(null);
  if (!files.length) return null;

  return (
    <>
      <ul className={cn("space-y-2", className)}>
        {files.map((f) => (
          <FileRow key={f.fileurl} name={f.filename} size={f.filesize} mimetype={f.mimetype}>
            {previewKind(f) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreview(f)}
                aria-label={`${t("common.preview")}: ${f.filename}`}
                title={t("common.preview")}
              >
                <Eye size={16} strokeWidth={1.85} />
              </Button>
            )}
            {/* A plain link: the file proxy is no page for the Next.js router. */}
            <a
              href={fileUrl(f.fileurl, { download: true })}
              className={buttonClass("ghost", "icon")}
              aria-label={`${t("common.download")}: ${f.filename}`}
              title={t("common.download")}
            >
              <Download size={16} strokeWidth={1.85} />
            </a>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => onRemove(f)}
                aria-label={t("common.removeFile", { name: f.filename })}
                title={t("common.removeFile", { name: f.filename })}
              >
                <Trash2 size={16} strokeWidth={1.85} />
              </Button>
            )}
          </FileRow>
        ))}
      </ul>
      <PreviewDialog file={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function PreviewDialog({ file, onClose }: { file: MoodleFile | null; onClose: () => void }) {
  const kind = file ? previewKind(file) : null;
  return (
    <Modal
      open={!!file}
      onCancel={onClose}
      footer={null}
      title={file?.filename}
      width={kind === "pdf" ? 1000 : 860}
      centered
      destroyOnHidden
    >
      {file && kind === "image" && (
        // Proxied Moodle file of unknown size: next/image can't optimise it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl(file.fileurl)} alt={file.filename} className="mx-auto max-h-[75vh] max-w-full object-contain" />
      )}
      {file && kind === "pdf" && (
        <iframe src={fileUrl(file.fileurl)} title={file.filename} className="h-[75vh] w-full rounded-control border border-line" />
      )}
      {file && kind === "video" && (
        <video src={fileUrl(file.fileurl)} controls className="max-h-[75vh] w-full rounded-control" />
      )}
    </Modal>
  );
}
