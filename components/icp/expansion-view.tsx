"use client";

import React from "react";
import { IcpExpandedProfile } from "@/types/icp";
import { CheckCircle2, XCircle, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface ExpansionViewProps {
  expandedProfile: IcpExpandedProfile;
  profileId: string;
  dbWarning?: string;
  onProceed: (profileId: string) => void;
  isSearching: boolean;
}

export function ExpansionView({
  expandedProfile,
  profileId,
  dbWarning,
  onProceed,
  isSearching,
}: ExpansionViewProps) {
  return (
    <div className="space-y-6 max-w-2xl bg-card border border-border p-6 md:p-8 rounded-xl shadow-lg animate-fade-in">
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Expanded Target Profile</h2>
          <p className="text-muted-foreground text-xs">Our AI has formulated a targeted lead strategy based on your description.</p>
        </div>
      </div>

      {dbWarning && (
        <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs leading-relaxed">
          <strong>Database Notice:</strong> {dbWarning}
        </div>
      )}

      {/* Target Segments */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Target Segments & Fit</h3>
        <ul className="space-y-2">
          {expandedProfile.targetCompanies.map((target, idx) => (
            <li key={idx} className="flex gap-2.5 items-start text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{target}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Exclusion Criteria */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Exclusion Criteria (Negative Filters)</h3>
        <ul className="space-y-2">
          {expandedProfile.exclude.map((exclude, idx) => (
            <li key={idx} className="flex gap-2.5 items-start text-sm text-foreground">
              <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{exclude}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reasoning */}
      <div className="space-y-2.5 pt-2 border-t border-border/40">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Strategic Rationale</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{expandedProfile.reasoning}</p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onProceed(profileId)}
        disabled={isSearching}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-lg hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg shadow-primary/10 text-sm mt-6"
      >
        {isSearching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Discovering Companies...
          </>
        ) : (
          <>
            <span>Launch Company Discovery</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}
