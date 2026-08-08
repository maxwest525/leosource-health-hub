/** TruEnroll wordmark: bare gradient shield glyph plus the two-tone name. */
export const TruLogo = ({
  size = 30,
  tone = "dark",
}: {
  size?: number;
  /** `dark` = navy text for light backgrounds, `light` = white text for dark backgrounds. */
  tone?: "dark" | "light";
}) => (
  <span className="flex items-center gap-2">
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="tru-shield" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#21C0A8" />
          <stop offset="1" stopColor="#1877D2" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.2 4.8 6.5v8.2c0 6.9 4.6 12.9 11.2 15.1 6.6-2.2 11.2-8.2 11.2-15.1V6.5L16 2.2Z"
        fill="url(#tru-shield)"
      />
      <path
        d="m10.9 16.2 3.5 3.5 6.8-6.8"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span
      className="text-[21px] font-bold tracking-tight"
      style={{ color: tone === "light" ? "#FFFFFF" : "#0F2B46" }}
    >
      Tru<span style={{ color: tone === "light" ? "#7FD2FF" : "#1877D2" }}>Enroll</span>
    </span>
  </span>
);
