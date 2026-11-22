"use client";
import { TriangleAlert } from "lucide-react";
import { RichText } from "@/components/ui";

/** Error messages from validation or Moodle warnings (announced to screen readers). */
export function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-error/30 bg-error-soft px-4 py-3 text-[13px] text-error-text"
    >
      <TriangleAlert size={16} strokeWidth={1.85} className="mt-0.5 shrink-0" />
      <ul className="space-y-0.5">
        {errors.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

/** Checkbox for the site's submission statement (Moodle HTML). */
export function StatementCheckbox({
  statement,
  checked,
  onChange,
  disabled,
}: {
  statement: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-line transition-colors has-[:checked]:bg-primary-soft has-[:checked]:ring-primary/40">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <RichText html={statement} className="text-[13px]" />
    </label>
  );
}
