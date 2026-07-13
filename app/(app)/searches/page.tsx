"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ArrowRight,
  Sparkles,
  Building2,
  MapPin,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

interface SearchRecord {
  id: string;
  rawInput?: Record<string, any>;
  status: string;
  totalFound: number;
  qualifiedCount: number;
  createdAt: string;
  resultCount: number;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SearchesPage() {
  const { data, isLoading } = useQuery<{ data: SearchRecord[] }>({
    queryKey: ["search-history"],
    queryFn: async () => {
      const res = await fetch("/api/searches?limit=50");
      return res.json();
    },
  });

  const searches = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review prior ICP discovery runs, their outcomes, and the leads they surfaced.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
        >
          <Search className="h-4 w-4" />
          New Search
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border bg-card/40 p-5">
              <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted/50" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted/50" />
            </div>
          ))}
        </div>
      ) : searches.length === 0 ? (
        <EmptyState
          title="No search history yet"
          description="Start a discovery run from the dashboard to build your first ICP search and populate this view."
          action={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              Run Your First Search
            </Link>
          }
          icon={<Search className="h-6 w-6 text-muted-foreground/80" />}
        />
      ) : (
        <div className="grid gap-4">
          {searches.map((search) => {
            const input = search.rawInput ?? {};
            const product = input.productDescription || input.product || input.industry || "Discovery search";
            const country = input.country || "—";
            const keywords = input.keywords || input.searchTerms || [];

            return (
              <article
                key={search.id}
                className="rounded-xl border border-border bg-card/40 p-5 shadow-sm transition-colors hover:border-primary/20 hover:bg-card/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Search className="h-4 w-4 text-primary" />
                      {product}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {country}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {search.resultCount} linked companies
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(search.createdAt)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
                      search.status === "complete"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : search.status === "error"
                        ? "border-red-500/20 bg-red-500/10 text-red-400"
                        : "border-border bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {search.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Companies Found</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">{search.totalFound}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qualified Leads</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">{search.qualifiedCount}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Keywords</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {keywords.length > 0 ? keywords.slice(0, 4).join(", ") : "—"}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
