import React from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface BreakdownItem {
  raw: number;
  weight: number;
  contribution: number;
  label?: string;
}

interface ScoreBreakdownProps {
  breakdown: Record<string, BreakdownItem>;
  totalScore: number;
}

const FACTOR_LABELS: Record<string, string> = {
  categoryFit: "Category Fit",
  geography: "Geography Match",
  brandMatch: "Brand Match",
  competitorPresence: "Competitor Brands",
  storeCount: "Store Footprint",
  buyingSignals: "Buying Signals",
  websiteQuality: "Website Quality",
  // Legacy factors for backward compat
  revenue: "Revenue Band",
  employeeCount: "Employee Count",
  ecommerce: "E-Commerce",
  dataQuality: "Data Quality",
};

const FACTOR_DESCRIPTIONS: Record<string, string> = {
  categoryFit: "How well this retailer's categories match your target category",
  geography: "Whether the company operates in your target country/market",
  brandMatch: "Whether your specific brand or keywords appear on their site",
  competitorPresence: "Number of competitor brands found on their website",
  storeCount: "Physical store footprint — more locations = higher buying volume",
  buyingSignals: "Recency-weighted signals detected (expansion, hiring, wholesale page, etc.)",
  websiteQuality: "Website completeness — contact page, wholesale page, store finder",
};

export function ScoreBreakdown({ breakdown, totalScore }: ScoreBreakdownProps) {
  const factors = Object.entries(breakdown).sort(
    ([, a], [, b]) => b.contribution - a.contribution
  );

  const getBandColor = (score: number): "hot" | "warm" | "nurture" | "primary" => {
    if (score >= 80) return "hot";
    if (score >= 60) return "warm";
    if (score >= 40) return "nurture";
    return "primary";
  };

  return (
    <div className="space-y-4">
      {/* Total score dial */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/40">
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke={
                totalScore >= 80
                  ? "hsl(142 72% 46%)"
                  : totalScore >= 60
                  ? "hsl(38 92% 52%)"
                  : totalScore >= 40
                  ? "hsl(217 91% 60%)"
                  : "hsl(220 10% 45%)"
              }
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(totalScore / 100) * 163.4} 163.4`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold">{Math.round(totalScore)}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Opportunity Score</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Computed deterministically — not by AI
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Score ≥ 60 triggers AI enrichment
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-3">
        {factors.map(([key, item]) => {
          const label = item.label ?? FACTOR_LABELS[key] ?? key;
          const description = FACTOR_DESCRIPTIONS[key];
          const weightPct = Math.round(item.weight * 100);

          return (
            <div key={key} className="space-y-1.5" title={description}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{label}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{Math.round(item.raw)}/100</span>
                  <span className="text-border">·</span>
                  <span>{weightPct}% weight</span>
                  <span className="text-border">·</span>
                  <span className="font-semibold text-foreground">
                    +{item.contribution.toFixed(1)}pts
                  </span>
                </div>
              </div>
              <ProgressBar
                value={item.raw}
                color={getBandColor(item.raw)}
                size="sm"
              />
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
        Weights are category-specific templates — configurable per industry. Score is 100% deterministic and auditable.
      </p>
    </div>
  );
}
