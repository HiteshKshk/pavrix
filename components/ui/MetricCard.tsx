import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  loading?: boolean;
}

export function MetricCard({ label, value, icon, trend, className = "", loading = false }: MetricCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 flex flex-col gap-3 backdrop-blur-sm transition-all duration-200 hover:border-primary/20 hover:bg-card/80 ${className}`}
    >
      {/* Subtle gradient orb */}
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">
            {icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-8 w-20" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tight text-foreground animate-count-up">
            {value}
          </span>
          {trend && (
            <span
              className={`text-xs font-medium pb-1 ${
                trend.value >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
