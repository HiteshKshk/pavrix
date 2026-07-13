"use client";

import React from "react";
import { Brain, Search, Globe, Zap, BarChart2, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export type PipelineStage =
  | "building_icp"
  | "searching"
  | "crawling"
  | "signals"
  | "ranking"
  | "ai_analysis"
  | "complete"
  | "error"
  | "idle";

interface StageConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STAGES: Record<string, StageConfig> = {
  building_icp: {
    label: "Building ICP",
    description: "Expanding your Ideal Customer Profile with AI...",
    icon: <Brain className="h-4 w-4" />,
  },
  searching: {
    label: "Searching Companies",
    description: "Discovering matching businesses via search providers...",
    icon: <Search className="h-4 w-4" />,
  },
  crawling: {
    label: "Analyzing Websites",
    description: "Crawling sites with Playwright to extract intelligence...",
    icon: <Globe className="h-4 w-4" />,
  },
  signals: {
    label: "Extracting Signals",
    description: "Detecting buying signals from crawled data...",
    icon: <Zap className="h-4 w-4" />,
  },
  ranking: {
    label: "Ranking Companies",
    description: "Computing deterministic opportunity scores...",
    icon: <BarChart2 className="h-4 w-4" />,
  },
  ai_analysis: {
    label: "Generating AI Insights",
    description: "Creating summaries, explanations, and outreach...",
    icon: <Sparkles className="h-4 w-4" />,
  },
  complete: {
    label: "Complete",
    description: "Pipeline finished.",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  error: {
    label: "Error",
    description: "Something went wrong.",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

const STAGE_ORDER: PipelineStage[] = [
  "building_icp", "searching", "crawling", "signals", "ranking", "ai_analysis",
];

interface PipelineProgressProps {
  currentStage: PipelineStage;
  message?: string;
  pct?: number;
  error?: string;
}

export function PipelineProgress({ currentStage, message, pct = 0, error }: PipelineProgressProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage as any);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{STAGES[currentStage]?.label ?? "Processing..."}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {STAGE_ORDER.map((stage, i) => {
          const config = STAGES[stage];
          const isDone = i < currentIndex || currentStage === "complete";
          const isActive = stage === currentStage;
          const isPending = i > currentIndex && currentStage !== "complete";

          return (
            <div
              key={stage}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isPending ? "opacity-30" : "opacity-100"
              }`}
            >
              {/* Status icon */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : isActive
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  config.icon
                )}
              </div>

              {/* Label */}
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium ${
                    isDone ? "text-emerald-400" : isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {config.label}
                </div>
                {isActive && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {message || config.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {currentStage === "error" && error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
