import { useCallback, useEffect, useRef } from "react";

/**
 * Enables click/pointer drag-to-scroll on a horizontally scrollable element.
 * Native touch swipe keeps working; this adds mouse/trackpad drag on top.
 */
export const useDragScroll = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const state = useRef({ down: false, dragging: false, startX: 0, startY: 0, scrollLeft: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    state.current = {
      down: true,
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
    };
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const el = ref.current;
    const s = state.current;
    if (!el || !s.down) return;
    const dx = e.clientX - s.startX;
    if (!s.dragging) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - s.startY)) return;
      s.dragging = true;
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    }
    e.preventDefault();
    el.scrollLeft = s.scrollLeft - dx;
  }, []);

  const endDrag = useCallback(() => {
    const el = ref.current;
    state.current.down = false;
    state.current.dragging = false;
    if (el) {
      el.style.cursor = "";
      el.style.userSelect = "";
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", endDrag);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("pointerleave", endDrag);
    };
  }, [onPointerDown, onPointerMove, endDrag]);

  return ref;
};
