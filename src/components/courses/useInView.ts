"use client";
import { useEffect, useState } from "react";

/**
 * Becomes true once the element comes within `rootMargin` of the viewport and
 * then stays true, so a card loads its extra data only when it is about to be
 * seen. Pass the returned setter as the element's `ref`.
 */
export function useInView<T extends Element>(rootMargin = "200px") {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView, rootMargin]);

  return [setNode, inView] as const;
}
