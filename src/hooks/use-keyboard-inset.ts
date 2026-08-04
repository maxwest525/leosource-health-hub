import { useEffect, useState } from "react";

/**
 * Height in CSS pixels currently covered by the on-screen keyboard.
 *
 * iOS Safari does not resize the layout viewport when the keyboard opens, so a
 * bottom-pinned composer ends up hidden behind it. Tracking the visual viewport
 * lets us lift the composer by exactly the covered amount.
 */
export const useKeyboardInset = (): number => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(covered > 40 ? Math.round(covered) : 0);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
};
