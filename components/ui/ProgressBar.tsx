import React from "react";

interface ProgressBarProps {
  value: number; // 0–100
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "primary" | "hot" | "warm" | "nurture";
  size?: "sm" | "md";
  className?: string;
}

const COLOR_MAP = {
  primary: "bg-primary",
  hot: "bg-emerald-500",
  warm: "bg-amber-500",
  nurture: "bg-blue-500",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  color = "primary",
  size = "md",
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const heightClass = size === "sm" ? "h-1.5" : "h-2";
  const barColor = COLOR_MAP[color];

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-semibold text-foreground">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${heightClass} rounded-full bg-secondary/60 overflow-hidden`}>
        <div
          className={`${heightClass} rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
