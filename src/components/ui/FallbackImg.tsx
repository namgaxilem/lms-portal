"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fileUrl } from "@/lib/moodle/files";

/**
 * <img> that renders `fallback` when the source fails. Moodle pluginfile URLs
 * are routed through the authenticated /api/moodle/file proxy (they 403
 * without a Moodle session). Also catches errors that fire before hydration,
 * when React's onError isn't attached yet.
 */
export function FallbackImg({
  src,
  fallback,
  className,
  style,
  onLoad,
}: {
  src?: string | null;
  fallback: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth === 0) setFailed(true);
    // Loaded before hydration: React missed the load event.
    else onLoad?.({ currentTarget: img } as React.SyntheticEvent<HTMLImageElement>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={fileUrl(src)}
      alt=""
      style={style}
      className={className}
      onError={() => setFailed(true)}
      onLoad={onLoad}
    />
  );
}
