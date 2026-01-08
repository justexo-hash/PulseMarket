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
  // Use CSS variable colors
  const colorClass = resolved
    ? outcome === "yes"
      ? "stroke-success"
      : "stroke-destructive"
    : "stroke-primary";

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="70" height="35">
        {/* Background semicircle */}
        <path
          d="M5,35 A30,30 0 0 1 65,35"
          fill="none"
          className="stroke-muted"
          strokeWidth="5"
        />

        {/* Progress arc */}
        <path
          d="M5,35 A30,30 0 0 1 65,35"
          fill="none"
          className={`${colorClass} transition-all duration-300`}
          strokeWidth="5"
          strokeDasharray={Math.PI * 30}
          strokeDashoffset={(1 - value / 100) * Math.PI * 30}
          strokeLinecap="round"
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
