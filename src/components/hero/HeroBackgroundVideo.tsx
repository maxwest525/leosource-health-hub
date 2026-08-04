import { useEffect, useRef, useState } from "react";
import heroPosterDesktop from "@/assets/hero-family.jpg";
import heroVideoDesktop from "@/assets/hero-video.mp4.asset.json";
import heroVideoMobile from "@/assets/hero-video-mobile.mp4.asset.json";
import heroPosterMobile from "@/assets/hero-poster-mobile.jpg.asset.json";

const MOBILE_QUERY = "(max-width: 639px)";

type Connection = { saveData?: boolean; effectiveType?: string };

const prefersLightMedia = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as Navigator & { connection?: Connection }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
};

/**
 * Background hero video that ships a small portrait encode to phones,
 * keeps the poster as the first paint, and only starts downloading the
 * video once the browser is idle.
 */
export function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false,
  );
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || prefersLightMedia()) return;

    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback;
    if (idle) {
      const handle = idle(() => setShouldLoad(true), { timeout: 2000 });
      return () => {
        (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
      };
    }
    const timer = window.setTimeout(() => setShouldLoad(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const src = isMobile ? heroVideoMobile.url : heroVideoDesktop.url;
  const poster = isMobile ? heroPosterMobile.url : heroPosterDesktop;

  useEffect(() => {
    if (!shouldLoad) return;
    const el = videoRef.current;
    if (!el) return;
    el.load();
    void el.play().catch(() => undefined);
  }, [shouldLoad, src]);

  return (
    <video
      ref={videoRef}
      key={src}
      className="absolute inset-0 h-full w-full object-cover object-[58%_35%] sm:object-center"
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  );
}
