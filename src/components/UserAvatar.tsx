const COLORS = [
  "bg-primary-container/15 text-primary",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Round avatar from initials, color-keyed by id. */
export function UserAvatar({
  name,
  id,
  size = 40,
}: {
  name: string;
  id: number;
  size?: number;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${COLORS[id % COLORS.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}
