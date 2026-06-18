interface ModuleMeta {
  /** i18n key under `modules.*`; unknown types fall back to the raw modname. */
  labelKey: string;
  /** Material Symbols glyph name. */
  iconName: string;
  /** antd Tag / accent color name. */
  color: string;
}

const MAP: Record<string, ModuleMeta> = {
  scorm: { labelKey: "modules.scorm", iconName: "play_circle", color: "magenta" },
  quiz: { labelKey: "modules.quiz", iconName: "quiz", color: "volcano" },
  assign: { labelKey: "modules.assign", iconName: "assignment", color: "geekblue" },
  resource: { labelKey: "modules.resource", iconName: "description", color: "blue" },
  url: { labelKey: "modules.url", iconName: "link", color: "cyan" },
  page: { labelKey: "modules.page", iconName: "article", color: "blue" },
  forum: { labelKey: "modules.forum", iconName: "forum", color: "green" },
  feedback: { labelKey: "modules.feedback", iconName: "rate_review", color: "gold" },
};

export function moduleMeta(modname: string): ModuleMeta {
  return (
    MAP[modname] ?? {
      labelKey: modname,
      iconName: "widgets",
      color: "default",
    }
  );
}
