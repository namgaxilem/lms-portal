"use client";
import { useState } from "react";
import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { moodleClient } from "@/lib/client-api";
import { isModuleDone, isTracked } from "@/lib/moodle/course-outline";
import { cn } from "@/components/ui";
import { useCourseNavigationState } from "./course-navigation";

/** completion = 1: the learner marks the activity done themselves. */
const MANUAL = 1;

/**
 * "Mark as done" for activities with manual completion (Moodle 5.2 puts the
 * same button in the activity header). Hidden for automatic completion and for
 * users whose completion isn't tracked.
 */
export function CompletionToggle({ courseId, cmid }: { courseId: number; cmid: number }) {
  const t = useT();
  const { nav, refresh } = useCourseNavigationState(courseId, cmid);
  const [override, setOverride] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const mod = nav?.current;
  if (!mod || mod.completion !== MANUAL || !isTracked(mod)) return null;
  const done = override ?? isModuleDone(mod);

  const toggle = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await moodleClient("core_completion_update_activity_completion_status_manually", { cmid, completed: !done });
      setOverride(!done);
      // The outline drawer, its progress and the next page read the new state.
      refresh();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const Icon = saving ? LoaderCircle : done ? CircleCheck : Circle;
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        title={done ? t("activity.completion.undo") : undefined}
        aria-label={done ? `${t("activity.completion.done")} · ${t("activity.completion.undo")}` : undefined}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
          done
            ? "bg-success-soft text-success-text hover:opacity-90"
            : "bg-surface text-fg shadow-card ring-1 ring-line hover:bg-surface-2"
        )}
      >
        <Icon size={18} strokeWidth={2} aria-hidden className={cn("shrink-0", saving && "animate-spin")} />
        {t(done ? "activity.completion.done" : "activity.completion.markDone")}
      </button>
      {failed && (
        <p role="alert" className="text-xs font-medium text-error-text">
          {t("activity.completion.error")}
        </p>
      )}
    </div>
  );
}
