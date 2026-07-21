"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Filter, Download, ChevronRight, ExternalLink,
  Building, MapPin, Tag, Users, List, Kanban,
} from "lucide-react";
import { ScoreBadge, StatusBadge, SignalBadge } from "@/components/ui/Badge";
import { StatusSelect } from "@/components/ui/StatusSelect";
import { normalizeCategory } from "@/lib/scoring.engine";

const SCORE_BANDS = ["All", "Hot", "Warm", "Nurture", "Deprioritize"];
const STATUS_VALUES = ["All", "New", "Qualified", "Contacted", "Meeting", "Won", "Lost", "Archive"];
const CATEGORIES = [
  "All",
  "sportswear",
  "footwear",
  "luxury",
  "outdoor",
  "kitchen",
  "toys",
  "fashion",
  "beauty",
  "accessories",
  "electronics",
  "home",
];

const COLUMNS = [
  { status: "New", label: "New", bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-400" },
  { status: "Qualified", label: "Qualified", bg: "bg-purple-500/5", border: "border-purple-500/20", text: "text-purple-400" },
  { status: "Contacted", label: "Contacted", bg: "bg-amber-500/5", border: "border-amber-500/20", text: "text-amber-400" },
  { status: "Meeting", label: "Meeting", bg: "bg-indigo-500/5", border: "border-indigo-500/20", text: "text-indigo-400" },
  { status: "Won", label: "Won", bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400" },
  { status: "Lost", label: "Lost", bg: "bg-rose-500/5", border: "border-rose-500/20", text: "text-rose-400" },
];

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category")
    ? normalizeCategory(searchParams.get("category")!)
    : "All";

  const [search, setSearch] = useState("");
  const [band, setBand] = useState("All");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [category, setCategory] = useState(initialCategory);
  const [showFilters, setShowFilters] = useState(false);
  const [viewType, setViewType] = useState<"table" | "pipeline">("table");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["leads", { search, band, status, source, category }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (band !== "All") qs.set("band", band);
      if (status !== "All") qs.set("status", status);
      if (source !== "All") qs.set("source", source);
      if (category !== "All") qs.set("category", category);
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

  async function handleStatusUpdate(leadId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        refetch();
      }
    } catch (e) {
      console.error("Failed to update lead status:", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads CRM</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? "Loading..." : `${leads.length} company${leads.length !== 1 ? "ies" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle View */}
          <div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewType("table")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewType === "table"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewType("pipeline")}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewType === "pipeline"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Pipeline Board"
            >
              <Kanban className="h-3.5 w-3.5" />
            </button>
          </div>

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

            {/* Category */}
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                Category
              </label>
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 focus:outline-none focus:border-primary/50 transition-all cursor-pointer capitalize"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-background text-foreground capitalize">
                      {c === "All" ? "All Categories" : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewType === "pipeline" ? (
        /* Kanban Pipeline CRM View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[500px] items-start">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => (l.status ?? "New").toLowerCase() === col.status.toLowerCase());
            const isDraggingOver = dragOverCol === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDragEnter={() => setDragOverCol(col.status)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) {
                    await handleStatusUpdate(id, col.status);
                  }
                }}
                className={`rounded-2xl border p-4 flex flex-col gap-3 min-h-[450px] transition-all duration-200 ${col.bg} ${
                  isDraggingOver
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20 scale-[1.01]"
                    : "border-border/60"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`h-2 w-2 rounded-full ${col.text.replace("text", "bg")}`} />
                    <span className="font-semibold text-xs text-foreground truncate">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {colLeads.length}
                  </span>
                </div>

                {/* Column Cards List */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[600px] scrollbar-none pr-1">
                  {colLeads.length === 0 ? (
                    <div className="h-28 flex items-center justify-center rounded-xl border border-dashed border-border/40 text-[10px] text-muted-foreground text-center px-4">
                      No leads. Drag here to update status.
                    </div>
                  ) : (
                    colLeads.map((lead) => {
                      const leadBand = lead.scoreBand ?? (lead.score >= 80 ? "Hot" : lead.score >= 60 ? "Warm" : lead.score >= 40 ? "Nurture" : "Deprioritize");
                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", lead.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          className="bg-card/40 border border-border/60 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-card/85 hover:scale-[1.01] hover:shadow-lg transition-all duration-150 space-y-2 group"
                        >
                          <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {lead.name}
                          </div>
                          
                          <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                            <span className="text-[9px] text-muted-foreground capitalize truncate max-w-[80px]">
                              {lead.bestCategory ?? lead.categoryTags?.[0] ?? "—"}
                            </span>
                            <ScoreBadge score={lead.score ?? 0} band={leadBand as any} size="sm" />
                          </div>

                          {lead.signals && lead.signals.length > 0 && (
                            <div className="flex items-center gap-0.5 flex-wrap pt-1.5 border-t border-border/20">
                              {lead.signals.slice(0, 3).map((sig: any) => (
                                <SignalBadge key={sig.id ?? sig.type} type={sig.type} small />
                              ))}
                              {lead.signals.length > 3 && (
                                <span className="text-[9px] text-muted-foreground font-medium ml-0.5 shrink-0">
                                  +{lead.signals.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Leads Table View */
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-sticky-header">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground font-medium bg-card/20">
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Signals</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card/10">
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
      )}
    </div>
  );
}

