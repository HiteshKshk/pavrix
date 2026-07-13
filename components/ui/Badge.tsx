import React from "react";

type ScoreBand = "Hot" | "Warm" | "Nurture" | "Deprioritize";

const BAND_CONFIG: Record<ScoreBand, { label: string; className: string }> = {
  Hot: { label: "Hot", className: "band-bg-hot band-hot border" },
  Warm: { label: "Warm", className: "band-bg-warm band-warm border" },
  Nurture: { label: "Nurture", className: "band-bg-nurture band-nurture border" },
  Deprioritize: { label: "Low", className: "band-bg-deprioritize band-deprioritize border" },
};

const STATUS_CONFIG: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Qualified: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  Contacted: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Meeting: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  Won: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Lost: "bg-red-500/10 text-red-400 border border-red-500/20",
  Archive: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
};

interface ScoreBadgeProps {
  score: number;
  band: ScoreBand;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, band, size = "md" }: ScoreBadgeProps) {
  const config = BAND_CONFIG[band];
  const sizeClass = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${config.className}`}>
      <span className="font-bold">{Math.round(score)}</span>
      <span className="opacity-70">· {config.label}</span>
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const className = STATUS_CONFIG[status] ?? STATUS_CONFIG.New;
  const sizeClass = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${className}`}>
      {status}
    </span>
  );
}

interface SignalBadgeProps {
  type: string;
  small?: boolean;
}

const SIGNAL_ICONS: Record<string, string> = {
  expansion: "📈",
  hiring: "💼",
  new_ecommerce: "🛒",
  competitor_brand_sold: "🏷️",
  funding: "💰",
  trade_show: "🎪",
  store_locator_present: "📍",
  wholesale_page: "🤝",
  premium_segment: "⭐",
  import_business: "🌍",
  multiple_locations: "🏪",
};

export function SignalBadge({ type, small = false }: SignalBadgeProps) {
  const icon = SIGNAL_ICONS[type] ?? "📊";
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (small) {
    return (
      <span title={label} className="text-base cursor-default" aria-label={label}>
        {icon}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/20">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
