"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ExternalLink, Globe, Phone, MapPin,
  BarChart2, Zap, Mail, MessageSquare, FileText, Building,
} from "lucide-react";
import { ScoreBadge, SignalBadge } from "@/components/ui/Badge";
import { StatusSelect } from "@/components/ui/StatusSelect";
import { ScoreBreakdown } from "@/components/leads/ScoreBreakdown";
import { OutreachPanel } from "@/components/leads/OutreachPanel";

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const LinkedIn = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

type DetailTab = "overview" | "score" | "signals" | "outreach" | "notes";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.leadId as string;
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Lead not found");
      return res.json();
    },
    enabled: !!leadId,
  });

  const lead = data?.data;

  // Initialize notes from server
  React.useEffect(() => {
    if (lead?.notes && !notes) setNotes(lead.notes ?? "");
  }, [lead]);

  async function handleSaveNotes() {
    await fetch(`/api/leads/${leadId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 3000);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="text-4xl">🔍</div>
        <h2 className="text-xl font-semibold">Lead Not Found</h2>
        <p className="text-muted-foreground text-sm">This lead may have been removed or the ID is invalid.</p>
        <button onClick={() => router.push("/leads")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all">
          Back to Leads
        </button>
      </div>
    );
  }

  const bestScore = lead.scores?.[0];
  const band = bestScore?.totalScore >= 80 ? "Hot" : bestScore?.totalScore >= 60 ? "Warm" : bestScore?.totalScore >= 40 ? "Nurture" : "Deprioritize";
  const primaryOutreach = lead.outreach?.[0] ?? null;

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Building className="h-3.5 w-3.5" /> },
    { key: "score", label: "Score", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { key: "signals", label: `Signals (${lead.signals?.length ?? 0})`, icon: <Zap className="h-3.5 w-3.5" /> },
    { key: "outreach", label: "Outreach", icon: <Mail className="h-3.5 w-3.5" /> },
    { key: "notes", label: "Notes", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </button>

      {/* Lead header */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{lead.name}</h1>
                {bestScore && (
                  <ScoreBadge score={bestScore.totalScore} band={band as any} size="md" />
                )}
              </div>

              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {lead.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {lead.country ?? lead.address}
                  </span>
                )}
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.phone}
                  </span>
                )}
                {lead.decisionMakerTitle && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Attn: {lead.decisionMakerTitle}
                  </span>
                )}
              </div>

              {lead.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {lead.description}
                </p>
              )}
            </div>
          </div>

          <StatusSelect
            leadId={lead.id}
            currentStatus={lead.status ?? "New"}
          />
        </div>

        {/* Score explanation */}
        {lead.aiExplanation && (
          <div className="mt-4 p-3 rounded-lg border border-primary/15 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
            <span className="text-primary font-medium">AI Insight: </span>
            {lead.aiExplanation}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl bg-card/40 border border-border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-border bg-card/40 p-6 animate-fade-in" key={activeTab}>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Industry", value: lead.categoryTags?.join(", ") || "—" },
                { label: "Source", value: lead.source === "inbound" ? "Inbound Lead" : "AI Discovery" },
                { label: "Discovery Date", value: lead.discoveryDate ? new Date(lead.discoveryDate).toLocaleDateString() : "—" },
                { label: "Revenue Band", value: lead.revenueBand ?? "—" },
                { label: "Employee Band", value: lead.employeeCountBand ?? "—" },
                { label: "Store Count", value: lead.storeCount != null ? `${lead.storeCount} locations` : "—" },
                { label: "E-Commerce", value: lead.hasEcommerce ? "Yes ✓" : "No" },
                { label: "Status", value: lead.status ?? "New" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</div>
                  <div className="text-sm font-medium text-foreground">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Crawl data */}
            {lead.crawlData && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Website Intelligence (Crawled)
                </h3>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${lead.crawlData.hasWholesalePage ? "bg-emerald-400" : "bg-border"}`} />
                    Wholesale Page: {lead.crawlData.hasWholesalePage ? "Yes" : "No"}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${lead.crawlData.hasStoreFinder ? "bg-emerald-400" : "bg-border"}`} />
                    Store Finder: {lead.crawlData.hasStoreFinder ? "Yes" : "No"}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${lead.crawlData.hasEcommerce ? "bg-emerald-400" : "bg-border"}`} />
                    E-Commerce: {lead.crawlData.hasEcommerce ? "Yes" : "No"}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${lead.crawlData.hasContactPage ? "bg-emerald-400" : "bg-border"}`} />
                    Contact Page: {lead.crawlData.hasContactPage ? "Yes" : "No"}
                  </div>
                </div>

                {lead.crawlData.brandMentions?.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5">Brands Detected on Site</div>
                    <div className="flex flex-wrap gap-1">
                      {lead.crawlData.brandMentions.slice(0, 8).map((b: string) => (
                        <span key={b} className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-foreground border border-border">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {lead.crawlData.emails?.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Contact Emails</div>
                    <div className="flex flex-wrap gap-2">
                      {lead.crawlData.emails.slice(0, 4).map((e: string) => (
                        <a key={e} href={`mailto:${e}`} className="text-xs text-primary hover:underline">{e}</a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {lead.crawlData.socialLinks && Object.keys(lead.crawlData.socialLinks).length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Social Profiles</div>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(lead.crawlData.socialLinks).map(([platform, url]) => {
                        if (!url) return null;
                        return (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            {platform === "instagram" && <Instagram className="h-3.5 w-3.5" />}
                            {platform === "facebook" && <Facebook className="h-3.5 w-3.5" />}
                            {platform === "linkedin" && <LinkedIn className="h-3.5 w-3.5" />}
                            <span className="capitalize">{platform}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Product Categories */}
                {lead.crawlData.productCategories && lead.crawlData.productCategories.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Product Categories Scraped</div>
                    <div className="flex flex-wrap gap-1">
                      {lead.crawlData.productCategories.map((cat: string) => (
                        <span key={cat} className="px-2 py-0.5 rounded-full bg-secondary/80 text-xs text-foreground border border-border">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scraped Locations */}
                {lead.crawlData.locations && lead.crawlData.locations.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Addresses Found On Site</div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {lead.crawlData.locations.map((loc: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                          <span>{loc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scraped About Text */}
                {lead.crawlData.aboutText && (
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">Scraped Website Text</div>
                    <div className="text-xs text-muted-foreground leading-relaxed p-3.5 rounded-xl border border-border bg-secondary/30 max-h-40 overflow-y-auto scrollbar-none">
                      {lead.crawlData.aboutText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Score Tab */}
        {activeTab === "score" && (
          <>
            {bestScore ? (
              <ScoreBreakdown
                breakdown={bestScore.breakdown}
                totalScore={bestScore.totalScore}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8 text-sm">No score computed yet.</div>
            )}
          </>
        )}

        {/* Signals Tab */}
        {activeTab === "signals" && (
          <div className="space-y-3">
            {lead.signals?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">No signals detected.</div>
            ) : (
              lead.signals?.map((signal: any) => (
                <div
                  key={signal.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="text-xl shrink-0 mt-0.5">
                    <SignalBadge type={signal.type} small />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SignalBadge type={signal.type} />
                      <span className="text-xs font-semibold text-primary">+{signal.pointValue} pts</span>
                    </div>
                    {signal.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {signal.description}
                      </p>
                    )}
                    <div className="text-[11px] text-muted-foreground mt-1.5">
                      Detected: {new Date(signal.detectedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Outreach Tab */}
        {activeTab === "outreach" && (
          <OutreachPanel leadId={lead.id} outreach={primaryOutreach} />
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">CRM Notes</h3>
              {notesSaved && <span className="text-xs text-emerald-400">Saved ✓</span>}
            </div>
            <textarea
              id={`notes-${lead.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this lead — call history, next steps, follow-up dates..."
              className="w-full min-h-[200px] rounded-xl border border-border bg-card/40 p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors leading-relaxed"
            />
            <button
              onClick={handleSaveNotes}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              Save Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
