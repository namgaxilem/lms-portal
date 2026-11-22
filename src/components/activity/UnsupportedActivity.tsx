"use client";
import { ExternalLink } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useSiteFunctions } from "@/lib/moodle/hooks";
import { moduleMeta } from "@/lib/module-meta";
import { moodleBase } from "@/lib/public-config";
import { Button, Card, IconTile } from "@/components/ui";
import { useLogView, type ActivityCm } from "./shared";

/**
 * View-logging web service per module type (Moodle 4.1+, all in the mobile
 * service): [function, instance-id parameter, extra arguments]. Most activities
 * on the site complete on view, so opening one in the portal must log it like
 * the Moodle app does.
 */
const VIEW_WS: Record<string, [string, string, Record<string, unknown>?]> = {
  quiz: ["mod_quiz_view_quiz", "quizid"],
  forum: ["mod_forum_view_forum", "forumid"],
  folder: ["mod_folder_view_folder", "folderid"],
  book: ["mod_book_view_book", "bookid"],
  lesson: ["mod_lesson_view_lesson", "lessonid"],
  feedback: ["mod_feedback_view_feedback", "feedbackid", { moduleviewed: true }],
  h5pactivity: ["mod_h5pactivity_view_h5pactivity", "h5pactivityid"],
  imscp: ["mod_imscp_view_imscp", "imscpid"],
  glossary: ["mod_glossary_view_glossary", "id", { mode: "letter" }],
  choice: ["mod_choice_view_choice", "choiceid"],
  wiki: ["mod_wiki_view_wiki", "wikiid"],
  data: ["mod_data_view_database", "databaseid"],
  lti: ["mod_lti_view_lti", "ltiid"],
  chat: ["mod_chat_view_chat", "chatid"],
  survey: ["mod_survey_view_survey", "surveyid"],
  workshop: ["mod_workshop_view_workshop", "workshopid"],
  bigbluebuttonbn: ["mod_bigbluebuttonbn_view_bigbluebuttonbn", "bigbluebuttonbnid"],
};

/** Logs the view when this Moodle offers the module's view function (chat/survey left core in 5.0). */
function useLogModuleView(cm: ActivityCm) {
  const { has } = useSiteFunctions();
  const [fn, param, extra] = VIEW_WS[cm.modname] ?? [null, ""];
  useLogView(fn && has(fn) ? fn : null, { [param]: cm.instance, ...extra });
}

/** Deep link to the activity on the Moodle site, when Moodle's URL is configured. */
function moodleViewUrl(cm: ActivityCm): string | null {
  const base = moodleBase();
  if (!base || !/^[a-z0-9_]+$/.test(cm.modname)) return null;
  return `${base}/mod/${cm.modname}/view.php?id=${cm.id}`;
}

/** Activity types without a portal viewer yet: what it is, and where to open it. */
export function UnsupportedActivity({ cm }: { cm: ActivityCm }) {
  const t = useT();
  const meta = moduleMeta(cm.modname);
  const href = moodleViewUrl(cm);
  useLogModuleView(cm);

  return (
    <Card className="animate-fade-in-up relative isolate overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-primary-soft" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 -z-10 h-44 w-44 rounded-full bg-surface-2" />
      <div className="flex flex-col items-center gap-4 px-5 py-12 text-center sm:py-14">
        <IconTile icon={meta.icon} tone={meta.tone} solid size="lg" />
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-fg">{t("activity.unsupported.title")}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{t("activity.unsupported.body")}</p>
        </div>
        <div className="mt-1 flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row">
          {href && (
            <Button href={href} external variant="gradient" size="lg" className="w-full sm:w-auto">
              {t("common.openExternal")}
              <ExternalLink size={16} strokeWidth={2} aria-hidden />
            </Button>
          )}
          <Button href={`/courses/${cm.course}`} variant="ghost" size="lg" className="w-full sm:w-auto">
            {t("activity.backToCourse")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
