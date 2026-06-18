"use client";
import { use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";
import { MaterialIcon } from "@/components/MaterialIcon";
import { MOODLE_BASE } from "@/lib/public-config";

export default function ScormPlayerPage({
  params,
}: {
  params: Promise<{ cmid: string }>;
}) {
  const { cmid } = use(params);
  const router = useRouter();
  const t = useT();
  const frameWrap = useRef<HTMLDivElement>(null);

  // Moodle's own SCORM activity page. Rendered inside the app via iframe so the
  // learner never leaves the portal. Requires a Moodle session in this browser
  // (same domain) or, in production, Moodle "Allow frame embedding" enabled.
  const src = `${MOODLE_BASE}/mod/scorm/view.php?id=${cmid}`;

  function fullscreen() {
    frameWrap.current?.requestFullscreen?.();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          <MaterialIcon name="arrow_back" />
          <span className="font-body-sm text-body-sm">{t("scorm.back")}</span>
        </button>

        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm text-primary">
            <MaterialIcon name="play_circle" fill />
            {t("scorm.title")}
          </h2>
          <button
            onClick={fullscreen}
            aria-label="Fullscreen"
            className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <MaterialIcon name="fullscreen" />
          </button>
        </div>
      </div>

      <div
        ref={frameWrap}
        className="overflow-hidden rounded-xl bg-surface-container-lowest card-elevation"
      >
        <iframe
          src={src}
          title={t("scorm.title")}
          className="h-[calc(100vh-12rem)] w-full border-0 bg-white"
          allow="fullscreen; autoplay; microphone; camera"
        />
      </div>

      <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
        <MaterialIcon name="info" className="!text-base" />
        {t("scorm.hint")}
      </p>
    </div>
  );
}
