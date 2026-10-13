"use client";
import { useEffect } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Link2,
  PackageOpen,
} from "lucide-react";
import { moodleClient, useMoodle } from "@/lib/client-api";
import { fileUrl } from "@/lib/moodle/files";
import { MOODLE_BASE } from "@/lib/public-config";
import { useT } from "@/i18n/I18nProvider";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  IconTile,
  QueryState,
  RichText,
} from "@/components/ui";

/* ---------------- Web service shapes (mod_*_get_*_by_courses) ---------------- */

interface ModFile {
  filename: string;
  fileurl: string;
  mimetype?: string;
  filesize?: number;
  sortorder?: number;
}

interface PageInstance {
  id: number;
  coursemodule: number;
  name: string;
  intro?: string;
  content?: string;
  contentformat?: number;
}

interface UrlInstance {
  id: number;
  coursemodule: number;
  name: string;
  intro?: string;
  externalurl: string;
  display?: number;
}

interface ResourceInstance {
  id: number;
  coursemodule: number;
  name: string;
  intro?: string;
  contentfiles?: ModFile[];
}

/** Fire-and-forget view logging (drives "view" activity completion). */
function useLogView(wsfunction: string, args: Record<string, unknown> | null) {
  const key = args ? JSON.stringify(args) : null;
  useEffect(() => {
    if (!key) return;
    moodleClient(wsfunction, JSON.parse(key)).catch(() => {});
  }, [wsfunction, key]);
}

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function kindOf(f: ModFile): "pdf" | "image" | "video" | "audio" | "other" {
  const mime = (f.mimetype ?? "").toLowerCase();
  const name = f.filename.toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}

function Header({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      {intro && intro.trim() && (
        <RichText html={intro} className="mt-2 text-sm text-muted" />
      )}
    </div>
  );
}

function NotFound() {
  const t = useT();
  return (
    <Card>
      <EmptyState
        icon={PackageOpen}
        title={t("activity.notFound")}
        hint={t("activity.notFoundHint")}
      />
    </Card>
  );
}

/* ---------------- Page ---------------- */

export function PageViewer({ cmid, courseid }: { cmid: number; courseid: number }) {
  const { data, loading, error } = useMoodle<{ pages: PageInstance[] }>(
    "mod_page_get_pages_by_courses",
    { courseids: [courseid] }
  );
  const page = data?.pages?.find((p) => p.coursemodule === cmid);
  useLogView("mod_page_view_page", page ? { pageid: page.id } : null);

  return (
    <QueryState loading={loading} error={error}>
      {!page ? (
        <NotFound />
      ) : (
        <div className="animate-fade-in-up">
          <Header title={page.name} />
          <Card className="p-6">
            <RichText
              html={page.content}
              plain={page.contentformat === 2}
              className="text-sm text-fg"
            />
          </Card>
        </div>
      )}
    </QueryState>
  );
}

/* ---------------- URL ---------------- */

export function UrlViewer({ cmid, courseid }: { cmid: number; courseid: number }) {
  const t = useT();
  const { data, loading, error } = useMoodle<{ urls: UrlInstance[] }>(
    "mod_url_get_urls_by_courses",
    { courseids: [courseid] }
  );
  const url = data?.urls?.find((u) => u.coursemodule === cmid);
  useLogView("mod_url_view_url", url ? { urlid: url.id } : null);

  let host = url?.externalurl ?? "";
  try {
    if (url) host = new URL(url.externalurl).hostname;
  } catch {
    /* keep raw value */
  }

  return (
    <QueryState loading={loading} error={error}>
      {!url ? (
        <NotFound />
      ) : (
        <div className="animate-fade-in-up">
          <Header title={url.name} intro={url.intro} />
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <IconTile icon={Link2} tone="primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{t("activity.externalLink")}</p>
              <p className="truncate text-[13px] text-muted" title={url.externalurl}>
                {host}
              </p>
              <p className="mt-0.5 text-xs text-subtle">{t("activity.externalHint")}</p>
            </div>
            <Button href={url.externalurl} external className="shrink-0">
              {t("activity.openLink")}
              <ExternalLink size={16} strokeWidth={1.75} />
            </Button>
          </Card>
        </div>
      )}
    </QueryState>
  );
}

/* ---------------- Resource (file) ---------------- */

function FileCard({ file }: { file: ModFile }) {
  const t = useT();
  const meta = [formatSize(file.filesize), file.mimetype].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <IconTile icon={FileText} tone="primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg" title={file.filename}>
          {file.filename}
        </p>
        {meta && <p className="truncate text-[13px] text-subtle">{meta}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" href={fileUrl(file.fileurl)} external>
          {t("activity.openFile")}
          <ExternalLink size={16} strokeWidth={1.75} />
        </Button>
        <Button href={fileUrl(file.fileurl, { download: true })} external>
          <Download size={16} strokeWidth={1.75} />
          {t("activity.download")}
        </Button>
      </div>
    </div>
  );
}

function MainFile({ file }: { file: ModFile }) {
  const src = fileUrl(file.fileurl);
  switch (kindOf(file)) {
    case "pdf":
      return (
        <Card className="overflow-hidden">
          <iframe src={src} title={file.filename} className="h-[75vh] w-full bg-surface-2" />
          <div className="border-t border-line">
            <FileCard file={file} />
          </div>
        </Card>
      );
    case "image":
      return (
        <Card className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- proxied Moodle file */}
          <img src={src} alt={file.filename} className="mx-auto max-h-[75vh] w-auto bg-surface-2" />
          <div className="border-t border-line">
            <FileCard file={file} />
          </div>
        </Card>
      );
    case "video":
      return (
        <Card className="overflow-hidden">
          <video src={src} controls className="max-h-[75vh] w-full bg-black" />
          <div className="border-t border-line">
            <FileCard file={file} />
          </div>
        </Card>
      );
    case "audio":
      return (
        <Card className="overflow-hidden">
          <div className="p-5">
            <audio src={src} controls className="w-full" />
          </div>
          <div className="border-t border-line">
            <FileCard file={file} />
          </div>
        </Card>
      );
    default:
      return (
        <Card>
          <FileCard file={file} />
        </Card>
      );
  }
}

export function ResourceViewer({ cmid, courseid }: { cmid: number; courseid: number }) {
  const t = useT();
  const { data, loading, error } = useMoodle<{ resources: ResourceInstance[] }>(
    "mod_resource_get_resources_by_courses",
    { courseids: [courseid] }
  );
  const res = data?.resources?.find((r) => r.coursemodule === cmid);
  useLogView("mod_resource_view_resource", res ? { resourceid: res.id } : null);

  const files = [...(res?.contentfiles ?? [])]
    .filter((f) => f.fileurl)
    .sort((a, b) => (a.sortorder ?? 0) - (b.sortorder ?? 0));
  const [main, ...extra] = files;

  return (
    <QueryState loading={loading} error={error}>
      {!res ? (
        <NotFound />
      ) : (
        <div className="animate-fade-in-up space-y-6">
          <Header title={res.name} intro={res.intro} />
          {main ? (
            <MainFile file={main} />
          ) : (
            <Card>
              <EmptyState icon={FileText} title={t("activity.noFile")} compact />
            </Card>
          )}
          {extra.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title={t("activity.files")} />
              <div className="divide-y divide-line">
                {extra.map((f) => (
                  <FileCard key={f.fileurl} file={f} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </QueryState>
  );
}

/* ---------------- Not yet native ---------------- */

export function UnsupportedActivity({
  cmid,
  modname,
  name,
}: {
  cmid: number;
  modname: string;
  name: string;
}) {
  const t = useT();
  return (
    <div className="animate-fade-in-up">
      <Header title={name} />
      <Card>
        <EmptyState
          icon={PackageOpen}
          title={t("activity.unsupportedTitle")}
          hint={t("activity.unsupportedHint")}
          action={
            MOODLE_BASE ? (
              // TEMPORARY: quiz/forum/lesson… have no native viewer yet.
              <Button
                variant="secondary"
                href={`${MOODLE_BASE}/mod/${modname}/view.php?id=${cmid}`}
                external
              >
                {t("activity.openInMoodle")}
                <ExternalLink size={16} strokeWidth={1.75} />
              </Button>
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
