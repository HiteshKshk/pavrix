"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Filter, Download, ChevronRight, ExternalLink,
  Building, MapPin, Tag, Users,
} from "lucide-react";
import { ScoreBadge, StatusBadge, SignalBadge } from "@/components/ui/Badge";
import { StatusSelect } from "@/components/ui/StatusSelect";

const SCORE_BANDS = ["All", "Hot", "Warm", "Nurture", "Deprioritize"];
const STATUS_VALUES = ["All", "New", "Qualified", "Contacted", "Meeting", "Won", "Lost", "Archive"];

export default function LeadsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [band, setBand] = useState("All");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leads", { search, band, status, source }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (band !== "All") qs.set("band", band);
      if (status !== "All") qs.set("status", status);
      if (source !== "All") qs.set("source", source);
      qs.set("limit", "100");
      const res = await fetch(`/api/leads?${qs.toString()}`);
      return res.json();
    },
  });

  const leads: any[] = data?.data ?? [];

  function handleDownloadCsv() {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (band !== "All") qs.set("band", band);
    if (status !== "All") qs.set("status", status);
    qs.set("format", "csv");
    window.open(`/api/leads?${qs.toString()}`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "Loading..." : `${leads.length} company${leads.length !== 1 ? "ies" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary/60 transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters {showFilters ? "▲" : "▼"}
          </button>
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary/60 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="leads-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, website, address..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-border bg-card/30 animate-slide-up">
            {/* Score band */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Score Band
              </label>
              <div className="flex flex-wrap gap-1">
                {SCORE_BANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBand(b)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      band === b
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </label>
              <div className="flex flex-wrap gap-1">
                {STATUS_VALUES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      status === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Source
              </label>
              <div className="flex gap-1">
                {["All", "inbound", "outbound"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      source === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leads table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-sticky-header">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground font-medium">
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Location</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Signals</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="skeleton h-8 w-8 rounded-lg" />
                          <div className="space-y-1.5">
                            <div className="skeleton h-3 w-28" />
                            <div className="skeleton h-2.5 w-20" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="skeleton h-3 w-20" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="skeleton h-3 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-6 w-16 rounded-full" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex gap-1">
                          <div className="skeleton h-4 w-4 rounded-full" />
                          <div className="skeleton h-4 w-4 rounded-full" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="skeleton h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                : leads.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No leads found. Adjust your filters or run a new search.
                      </td>
                    </tr>
                  )
                : leads.map((lead: any) => {
                    const band = lead.scoreBand ?? (lead.score >= 80 ? "Hot" : lead.score >= 60 ? "Warm" : lead.score >= 40 ? "Nurture" : "Deprioritize");
                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-secondary/20 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        {/* Company */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate max-w-[180px]">{lead.name}</div>
                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-[120px]">
                                    {lead.website.replace(/^https?:\/\//, "")}
                                  </span>
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground capitalize">{lead.bestCategory ?? lead.categoryTags?.[0] ?? "—"}</span>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {lead.country ?? lead.address ?? "—"}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3">
                          <ScoreBadge score={lead.score ?? 0} band={band as any} size="sm" />
                        </td>

                        {/* Signals */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-0.5">
                            {(lead.signals ?? []).slice(0, 5).map((sig: any) => (
                              <SignalBadge key={sig.id ?? sig.type} type={sig.type} small />
                            ))}
                            {(lead.signals ?? []).length > 5 && (
                              <span className="text-[10px] text-muted-foreground ml-1">
                                +{lead.signals.length - 5}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <StatusSelect
                            leadId={lead.id}
                            currentStatus={lead.status ?? "New"}
                            onUpdate={() => refetch()}
                            compact
                          />
                        </td>

                        {/* Arrow */}
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
