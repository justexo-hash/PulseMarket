"use client";

interface ProbabilityGaugeProps {
  value: number; // 0–100
  resolved?: boolean;
  outcome?: "yes" | "no";
}

export function ProbabilityGauge({
  value,
  resolved = false,
  outcome
}: ProbabilityGaugeProps) {
  const color = resolved
    ? outcome === "yes"
      ? "#16a34a" // green
      : "#dc2626" // red
    : "#3b82f6"; // primary blue (customize)

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="70" height="35">
        {/* Background semicircle */}
        <path
          d="M5,35 A30,30 0 0 1 65,35"
          fill="none"
          stroke="#334155"
          strokeWidth="5"
          className="opacity-40"
        />

        {/* Progress arc */}
        <path
          d="M5,35 A30,30 0 0 1 65,35"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={Math.PI * 30}
          strokeDashoffset={(1 - value / 100) * Math.PI * 30}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>

      <div className="-mt-[18px] text-center">
        <span className="font-semibold">{value}%</span>
        {!resolved && (
          <div className="text-[10px] text-muted-foreground">chance</div>
        )}
      </div>
    </div>
  );
}