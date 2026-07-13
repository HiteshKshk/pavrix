import React from "react";
import Link from "next/link";
import { BrainCircuit, Search, BarChart2, Mail, ArrowRight, Shield, Zap, Globe } from "lucide-react";

export const metadata = {
  title: "Pavrix — Find Your Next Wholesale Buyers Using AI",
  description:
    "Discover, qualify and contact high-quality retailers in minutes. AI-powered B2B sales intelligence for wholesale distributors.",
};

const PIPELINE_STEPS = [
  { icon: BrainCircuit, label: "Building ICP", desc: "AI expands your ideal customer profile into buyer segments" },
  { icon: Search, label: "Discovery", desc: "Brave Search + Google Places finds matching companies" },
  { icon: Globe, label: "Site Intelligence", desc: "Playwright crawls each site for brands, signals, contacts" },
  { icon: Zap, label: "Signal Detection", desc: "11 buying signals detected deterministically, recency-decayed" },
  { icon: BarChart2, label: "Opportunity Scoring", desc: "100-point deterministic score — never computed by AI" },
  { icon: Mail, label: "AI Outreach", desc: "Email, LinkedIn & follow-up grounded in real company data" },
];

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI ICP Expansion",
    desc: "Describe your product. AI expands it into specific buyer segments, exclusions, and search variants.",
    color: "text-violet-400",
    bg: "bg-violet-500/8",
  },
  {
    icon: BarChart2,
    title: "Auditable Scoring",
    desc: "Every lead gets a 0–100 deterministic score with a full factor breakdown. No AI black box.",
    color: "text-blue-400",
    bg: "bg-blue-500/8",
  },
  {
    icon: Zap,
    title: "Buying Signal Engine",
    desc: "11 signal types detected: wholesale page, store locator, hiring, expansion, competitor brands, and more.",
    color: "text-amber-400",
    bg: "bg-amber-500/8",
  },
  {
    icon: Mail,
    title: "Grounded Outreach",
    desc: "Cold email, LinkedIn message, and follow-up email generated from real signal and score data.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
  },
  {
    icon: Shield,
    title: "Cost-Controlled AI",
    desc: "AI only runs on leads scoring ≥ 60. Low-quality leads are saved without any paid API calls.",
    color: "text-red-400",
    bg: "bg-red-500/8",
  },
  {
    icon: Globe,
    title: "Provider Abstraction",
    desc: "Swap discovery (Brave / Google) or LLM (Gemini / OpenAI) via a single env var — no code change.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/8",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[500px] bg-violet-600/4 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-50 flex h-16 items-center justify-between px-6 md:px-12 border-b border-border/60 bg-card/10 backdrop-blur-xl sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-base tracking-tight">
            <span className="gradient-text">Pavrix</span>
            <span className="text-muted-foreground font-normal ml-1 text-sm">Sales Intelligence</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/leads"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Start Search
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-5xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary text-xs font-semibold mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          B2B Wholesale Sales Intelligence Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
          Find Your Next<br />
          <span className="gradient-text">Wholesale Buyers</span><br />
          Using AI
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          Discover, qualify and contact high-quality retailers in minutes.
          Powered by deterministic scoring, Playwright crawling, and targeted AI outreach.
        </p>

        {/* Stats bar */}
        <div className="flex items-center gap-8 mb-12 text-center">
          {[
            { value: "400+", label: "Brands" },
            { value: "11", label: "Categories" },
            { value: "≥60", label: "Score Gate" },
            { value: "0", label: "AI Scoring" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all shadow-xl shadow-primary/25 text-sm hover:scale-105 duration-200"
          >
            Start Search
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/leads"
            className="px-8 py-3.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 font-semibold transition-all text-sm"
          >
            View All Leads
          </Link>
        </div>
      </section>

      {/* Pipeline steps */}
      <section className="relative py-20 px-6 border-t border-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">End-to-End Pipeline</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Every search runs the same auditable 6-stage pipeline — from ICP expansion to personalized outreach.
            </p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-border hidden md:block" />

            <div className="space-y-4">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.label}
                    className="relative flex items-start gap-4 pl-0 md:pl-12"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {/* Step number */}
                    <div className="hidden md:flex absolute left-0 h-8 w-8 rounded-full bg-card border border-border items-center justify-center text-xs font-bold text-primary shrink-0">
                      {i + 1}
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card/30 flex-1 hover:border-primary/20 hover:bg-card/50 transition-all">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{step.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative py-20 px-6 border-t border-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">Built for Real B2B Sales</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Not generic lead-gen. Every feature is designed for wholesale distribution and B2B buyer discovery.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-2xl border border-border bg-card/30 flex flex-col gap-4 hover:border-primary/20 hover:bg-card/50 transition-all"
                >
                  <div className={`h-9 w-9 rounded-lg ${f.bg} flex items-center justify-center ${f.color}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-1.5">{f.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/60 py-8 text-center text-xs text-muted-foreground bg-card/10 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-1 mb-2">
          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-primary">Pavrix</span>
          <span>Sales Intelligence Platform</span>
        </div>
        <p>© 2026 Pavrix. Built for wholesale B2B sales teams.</p>
      </footer>
    </div>
  );
}
