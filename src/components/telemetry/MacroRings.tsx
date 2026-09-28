"use client";

/**
 * MacroRings — Apple Watch–style radial progress rings for nutrition tracking.
 * 
 * Renders 3 concentric rings (Protein, Carbs, Fats) around a central
 * calorie counter. Pure SVG, no external chart library needed.
 */

interface MacroRingsProps {
  /** Current consumed calories */
  consumedCalories: number;
  /** Target calories for the day */
  targetCalories: number;
  /** Consumed grams of protein */
  consumedProtein: number;
  /** Target grams of protein */
  targetProtein: number;
  /** Consumed grams of carbs */
  consumedCarbs: number;
  /** Target grams of carbs */
  targetCarbs: number;
  /** Consumed grams of fats */
  consumedFats: number;
  /** Target grams of fats */
  targetFats: number;
}

function Ring({
  radius,
  strokeWidth,
  progress,
  color,
  bgColor,
}: {
  radius: number;
  strokeWidth: number;
  progress: number; // 0–1 (can exceed 1)
  color: string;
  bgColor: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(progress, 1);
  const offset = circumference - clampedProgress * circumference;
  const isOverflow = progress > 1;

  return (
    <>
      {/* Background track */}
      <circle
        cx="120"
        cy="120"
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Foreground progress */}
      <circle
        cx="120"
        cy="120"
        r={radius}
        fill="none"
        stroke={isOverflow ? "#dc2626" : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 120 120)"
        style={{
          transition: "stroke-dashoffset 1s ease-out, stroke 0.3s ease",
          filter: isOverflow ? "drop-shadow(0 0 6px rgba(220, 38, 38, 0.6))" : `drop-shadow(0 0 4px ${color}40)`,
        }}
      />
    </>
  );
}

export default function MacroRings({
  consumedCalories,
  targetCalories,
  consumedProtein,
  targetProtein,
  consumedCarbs,
  targetCarbs,
  consumedFats,
  targetFats,
}: MacroRingsProps) {
  const calProgress = targetCalories > 0 ? consumedCalories / targetCalories : 0;
  const proProgress = targetProtein > 0 ? consumedProtein / targetProtein : 0;
  const carbProgress = targetCarbs > 0 ? consumedCarbs / targetCarbs : 0;
  const fatProgress = targetFats > 0 ? consumedFats / targetFats : 0;

  const remaining = Math.max(0, targetCalories - consumedCalories);
  const isOver = consumedCalories > targetCalories;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-60 h-60 sm:w-64 sm:h-64">
        <svg viewBox="0 0 240 240" className="w-full h-full">
          {/* Outer Ring — Calories (white/red) */}
          <Ring
            radius={108}
            strokeWidth={12}
            progress={calProgress}
            color="#ffffff"
            bgColor="#1a1a1a"
          />
          {/* Middle-outer Ring — Protein (red) */}
          <Ring
            radius={92}
            strokeWidth={10}
            progress={proProgress}
            color="#ef4444"
            bgColor="#1c1111"
          />
          {/* Middle-inner Ring — Carbs (yellow) */}
          <Ring
            radius={78}
            strokeWidth={10}
            progress={carbProgress}
            color="#f59e0b"
            bgColor="#1a1709"
          />
          {/* Inner Ring — Fats (indigo) */}
          <Ring
            radius={64}
            strokeWidth={10}
            progress={fatProgress}
            color="#6366f1"
            bgColor="#111127"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl sm:text-4xl font-black ${isOver ? 'text-red-500' : 'text-white'}`}>
            {isOver ? `+${consumedCalories - targetCalories}` : remaining}
          </span>
          <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
            {isOver ? "KCAL EXCEDIDO" : "KCAL RESTANTES"}
          </span>
        </div>
      </div>

      {/* Legends */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
        {[
          { label: "KCAL", consumed: consumedCalories, target: targetCalories, color: "bg-white" },
          { label: "PRO", consumed: consumedProtein, target: targetProtein, color: "bg-red-500" },
          { label: "CARB", consumed: consumedCarbs, target: targetCarbs, color: "bg-yellow-500" },
          { label: "FAT", consumed: consumedFats, target: targetFats, color: "bg-indigo-500" },
        ].map((m) => (
          <div key={m.label} className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className={`h-2 w-2 ${m.color}`} />
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{m.label}</span>
            </div>
            <p className="text-xs font-mono font-black text-zinc-300">
              {m.consumed}<span className="text-zinc-600">/{m.target}{m.label === "KCAL" ? "" : "g"}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
