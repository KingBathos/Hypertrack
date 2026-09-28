// ──────────────────────────────────────────────────
// Logo — HyperTrack Brutalism Edition
// ──────────────────────────────────────────────────

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl md:text-6xl",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const textClass = sizeConfig[size];

  return (
    <div className={`font-heading font-black uppercase tracking-tighter text-white ${textClass} ${className}`}>
      HYPER<span className="text-red-600">TRACK</span>{" "}
      <span className="text-[0.4em] align-top border-2 border-red-600 px-1 ml-1 font-mono tracking-widest text-zinc-400">
        OS
      </span>
    </div>
  );
}
