"use client";
import { useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { Button, cn } from "@/components/ui";

/** Desktop-like device: a physical keyboard is likely, so Enter can send. */
function enterSends() {
  return window.matchMedia("(pointer: fine)").matches;
}

/**
 * Message box: grows with its content. With a mouse/trackpad, Enter sends and
 * Shift+Enter adds a line (Enter while an input method is composing, e.g.
 * Vietnamese Telex, is left alone); on touch screens the on-screen Return key
 * adds a line and the button sends. The draft is kept when sending fails.
 */
export function Composer({
  placeholder,
  disabled,
  onSend,
}: {
  placeholder: string;
  disabled?: boolean;
  /** Resolves true when the message was sent. */
  onSend: (text: string) => Promise<boolean>;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const canSend = !disabled && !sending && draft.trim().length > 0;

  async function submit() {
    const text = draft.trim();
    if (!canSend) return;
    setSending(true);
    try {
      if (await onSend(text)) setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className="shrink-0 border-t border-line bg-surface p-3 sm:px-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl bg-surface-2 p-1.5 pl-4 ring-1 ring-line/60 transition dark:ring-line",
          "focus-within:bg-surface focus-within:ring-2 focus-within:ring-ring",
          disabled && "opacity-60"
        )}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && enterSends()) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={t("messages.typeMessage")}
          // 16px below sm: iOS Safari zooms the page into smaller form controls.
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base text-fg outline-none field-sizing-content placeholder:text-subtle disabled:cursor-not-allowed sm:py-2.5 sm:text-sm"
        />
        <Button
          type="submit"
          variant="gradient"
          size="icon"
          disabled={!canSend}
          aria-label={t("messages.send")}
        >
          {sending ? (
            <Loader2 size={18} strokeWidth={2} className="animate-spin" />
          ) : (
            <SendHorizontal size={18} strokeWidth={2} />
          )}
        </Button>
      </div>
      <p className="mt-1.5 hidden px-1 text-2xs text-subtle pointer-fine:block">{t("messages.enterHint")}</p>
    </form>
  );
}
