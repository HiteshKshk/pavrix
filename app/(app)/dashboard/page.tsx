"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Sparkles, Globe, TrendingUp, Search,
  Clock, ChevronRight, Building, ArrowUpRight,
} from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { ScoreBadge } from "@/components/ui/Badge";
import { SearchWizard } from "@/components/search/SearchWizard";
import { PipelineProgress, PipelineStage } from "@/components/search/PipelineProgress";

interface DashboardData {
  stats: {
    totalDiscovered: number;
    qualifiedCount: number;
    categoriesCount: number;
    avgScore?: number;
    countriesCount?: number;
    serpApiUsage: number;
    serpApiLimit: number;
  };
  categoryDistribution: Array<{ name: string; count: number }>;
  recentLeads: any[];
  dbWarning?: string;
}

type SearchView = "idle" | "wizard" | "running" | "done";

export default function DashboardPage() {
  const router = useRouter();
  const [searchView, setSearchView] = useState<SearchView>("idle");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [pipelineMsg, setPipelineMsg] = useState("");
  const [pipelinePct, setPipelinePct] = useState(0);
  const [pipelineError, setPipelineError] = useState("");
  const [searchedCategory, setSearchedCategory] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const { data, isLoading, refetch } = useQuery<{ data: DashboardData }>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard/metrics").then((r) => r.json()),
  });

  const { data: searchesData } = useQuery({
    queryKey: ["searches"],
    queryFn: () => fetch("/api/searches?limit=5").then((r) => r.json()),
  });

  const metrics = data?.data;
  const recentSearches = searchesData?.data ?? [];

  function handleStartSearch() {
    setSearchView("wizard");
  }

  function handleWizardSubmit(params: {
    product: string;
    brand: string;
    country: string;
    targetCustomer: string;
    keywords: string[];
  }) {
    setSearchView("running");
    setPipelineStage("building_icp");
    setPipelinePct(0);
    setPipelineError("");
    setSearchedCategory(params.targetCustomer);

    // Build SSE URL
    const qs = new URLSearchParams({
      product: params.product,
      brand: params.brand,
      country: params.country,
      targetCustomer: params.targetCustomer,
      keywords: params.keywords.join(","),
    });

    const es = new EventSource(`/api/discovery/stream?${qs.toString()}`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const progress = JSON.parse(event.data);
        setPipelineStage(progress.stage);
        setPipelineMsg(progress.message ?? "");
        setPipelinePct(progress.pct ?? 0);

        if (progress.stage === "complete") {
          es.close();
          setSearchView("done");
          refetch();
        } else if (progress.stage === "error") {
          setPipelineError(progress.error ?? "An error occurred");
          es.close();
        }
      } catch {}
    };

    es.onerror = () => {
      setPipelineStage("error");
      setPipelineError("Connection lost. Please try again.");
      es.close();
    };
  }

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your wholesale buyer pipeline — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        {searchView === "idle" && (
          <button
            onClick={handleStartSearch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            <Search className="h-4 w-4" />
            New Search
          </button>
        )}
      </div>

      {/* DB warning */}
      {metrics?.dbWarning && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-xs text-amber-400">
          ⚠️ {metrics.dbWarning} — Showing seed data. Configure DATABASE_URL to use live data.
        </div>
      )}

      {/* Search wizard / pipeline panel */}
      {searchView !== "idle" && (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 animate-slide-up">
          {searchView === "wizard" && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-semibold text-foreground">New Buyer Discovery Search</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete the steps below to run the AI pipeline
                  </p>
                </div>
                <button
                  onClick={() => setSearchView("idle")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
              <SearchWizard onSubmit={handleWizardSubmit} />
            </div>
          )}

          {searchView === "running" && (
            <div>
              <h2 className="font-semibold text-foreground mb-2">Running Pipeline</h2>
              <p className="text-xs text-muted-foreground mb-8">
                Each stage runs in sequence — wired to actual backend progress
              </p>
              <PipelineProgress
                currentStage={pipelineStage}
                message={pipelineMsg}
                pct={pipelinePct}
                error={pipelineError}
              />
            </div>
          )}

          {searchView === "done" && (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Search Complete!</h2>
                <p className="text-sm text-muted-foreground mt-1">New leads have been added to your pipeline.</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    const url = searchedCategory
                      ? `/leads?category=${encodeURIComponent(searchedCategory)}`
                      : "/leads";
                    router.push(url);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
                >
                  View All Leads
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setSearchView("idle"); refetch(); }}
                  className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary/60 transition-all"
                >
                  New Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SerpAPI Quota indicator */}
      {metrics?.stats && (
        <div className="rounded-xl border border-border bg-card/30 backdrop-blur-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fade-in">
          <div className="space-y-1 shrink-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              SerpAPI Search Quota Usage
            </h3>
            <p className="text-xs text-muted-foreground">
              Remaining: <span className="font-semibold text-foreground">{Math.max(0, metrics.stats.serpApiLimit - metrics.stats.serpApiUsage)}</span> searches of {metrics.stats.serpApiLimit} this month.
            </p>
          </div>
          <div className="flex-1 max-w-md w-full space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">
                {Math.round((metrics.stats.serpApiUsage / metrics.stats.serpApiLimit) * 100)}% Used
              </span>
              <span className="text-foreground">
                {metrics.stats.serpApiUsage} / {metrics.stats.serpApiLimit} searches
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  metrics.stats.serpApiUsage >= metrics.stats.serpApiLimit * 0.9
                    ? "bg-rose-500"
                    : metrics.stats.serpApiUsage >= metrics.stats.serpApiLimit * 0.75
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, (metrics.stats.serpApiUsage / metrics.stats.serpApiLimit) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Companies Found"
          value={metrics?.stats.totalDiscovered ?? 0}
          icon={<Building className="h-4 w-4" />}
          loading={isLoading}
        />
        <MetricCard
          label="Qualified Leads"
          value={metrics?.stats.qualifiedCount ?? 0}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
        />
        <MetricCard
          label="Categories"
          value={metrics?.stats.categoriesCount ?? 0}
          icon={<Sparkles className="h-4 w-4" />}
          loading={isLoading}
        />
        <MetricCard
          label="Markets"
          value={metrics?.stats.countriesCount ?? "—"}
          icon={<Globe className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {/* Bottom section: recent leads + recent searches */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent leads */}
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Top Leads
            </h2>
            <button
              onClick={() => router.push("/leads")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-border/40">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-4 w-16 ml-auto" />
                </div>
              ))
            ) : (metrics?.recentLeads ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No leads yet. Run a search to get started.
              </div>
            ) : (
              (metrics?.recentLeads ?? []).slice(0, 6).map((lead: any) => {
                const band = lead.score >= 80 ? "Hot" : lead.score >= 60 ? "Warm" : lead.score >= 40 ? "Nurture" : "Deprioritize";
                return (
                  <button
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{lead.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{lead.bestCategory}</div>
                    </div>
                    <ScoreBadge score={lead.score} band={band as any} size="sm" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Searches
            </h2>
            <button
              onClick={() => router.push("/searches")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-border/40">
            {recentSearches.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No searches yet. Click "New Search" to get started.
              </div>
            ) : (
              recentSearches.map((s: any) => {
                const input = s.rawInput ?? {};
                return (
                  <div key={s.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {input.productDescription ?? "Search"} in {input.country ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.totalFound} found · {s.qualifiedCount} qualified ·{" "}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        s.status === "complete"
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-muted-foreground bg-secondary border-border"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Category distribution */}
      {metrics?.categoryDistribution && metrics.categoryDistribution.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Category Distribution</h2>
          <div className="space-y-2">
            {metrics.categoryDistribution.slice(0, 8).map((cat) => {
              const maxCount = metrics.categoryDistribution[0].count;
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground w-24 truncate shrink-0">{cat.name}</div>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-primary/60 transition-all duration-700"
                      style={{ width: `${(cat.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-foreground w-6 text-right">{cat.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
