import type { CSSProperties } from "react";

/** Renders a Material Symbols (Outlined) glyph. `fill` switches to the filled axis. */
export function MaterialIcon({
  name,
  fill = false,
  className = "",
  style,
}: {
  name: string;
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={`material-symbols-outlined${fill ? " fill" : ""} ${className}`}
    >
      {name}
    </span>
  );
}
