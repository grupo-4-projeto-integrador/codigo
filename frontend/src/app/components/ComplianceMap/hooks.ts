import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasTransform } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const ZOOM_STEP = 0.12;

// ─── usePanZoom ───────────────────────────────────────────────────────────────
/**
 * Provides pan/zoom interactions for an infinite canvas.
 * Uses CSS `transform: translate3d + scale` for GPU acceleration.
 * Never writes to top/left — avoids layout thrashing.
 */
export function usePanZoom(initialScale = 0.85) {
  const [transform, setTransform] = useState<CanvasTransform>({
    x: 0,
    y: 0,
    scale: initialScale,
  });

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // ── Pointer Drag ────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setTransform((prev) => ({ ...prev, x: newX, y: newY }));
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Wheel Zoom (cursor-anchored) ────────────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { scale, x, y } = transformRef.current;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));

    // Zoom anchored to cursor position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const scaleFactor = newScale / scale;
    const newX = cx - scaleFactor * (cx - x);
    const newY = cy - scaleFactor * (cy - y);

    setTransform({ x: newX, y: newY, scale: newScale });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── Programmatic Controls ────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP * 2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP * 2),
    }));
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: initialScale });
  }, [initialScale]);

  const cssTransform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;

  return {
    containerRef,
    cssTransform,
    transform,
    scale: transform.scale,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn,
    zoomOut,
    resetView,
    isDragging,
  };
}

// ─── useMagneticHover ─────────────────────────────────────────────────────────
/**
 * Returns mouse-relative offset within an element for magnetic hover effects.
 * Uses GPU-accelerated CSS custom properties — zero React re-renders.
 */
export function useMagneticHover(strength = 6) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ((e.clientX - cx) / rect.width) * strength;
      const dy = ((e.clientY - cy) / rect.height) * strength;
      ref.current.style.setProperty("--mx", `${dx}px`);
      ref.current.style.setProperty("--my", `${dy}px`);
    },
    [strength]
  );

  const onMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty("--mx", "0px");
    ref.current.style.setProperty("--my", "0px");
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
