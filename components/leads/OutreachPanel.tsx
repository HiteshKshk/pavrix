"use client";

import React, { useState } from "react";
import { Copy, Check, RefreshCw, ThumbsUp, Send, MessagesSquare, Mail, MailOpen } from "lucide-react";

interface OutreachData {
  id: string;
  emailSubject?: string | null;
  draftText: string;
  linkedinDraft?: string | null;
  followupDraft?: string | null;
  status: string;
  signalsReferenced?: any[];
}

interface OutreachPanelProps {
  leadId: string;
  outreach: OutreachData | null;
}

type OutreachTab = "email" | "linkedin" | "followup";

export function OutreachPanel({ leadId, outreach }: OutreachPanelProps) {
  const [activeTab, setActiveTab] = useState<OutreachTab>("email");
  const [emailContent, setEmailContent] = useState(outreach?.draftText ?? "");
  const [linkedinContent, setLinkedinContent] = useState(outreach?.linkedinDraft ?? "");
  const [followupContent, setFollowupContent] = useState(outreach?.followupDraft ?? "");
  const [status, setStatus] = useState(outreach?.status ?? "drafted");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  if (!outreach) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <MailOpen className="h-8 w-8 mb-3 opacity-30" />
        <p className="text-sm">No outreach generated yet.</p>
        <p className="text-xs mt-1 opacity-60">
          Outreach is only generated for leads with score ≥ 60.
        </p>
      </div>
    );
  }

  const currentContent =
    activeTab === "email" ? emailContent : activeTab === "linkedin" ? linkedinContent : followupContent;

  const setCurrentContent = (val: string) => {
    if (activeTab === "email") setEmailContent(val);
    else if (activeTab === "linkedin") setLinkedinContent(val);
    else setFollowupContent(val);
  };

  async function handleCopy() {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApprove() {
    if (!outreach) return;

    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}/outreach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreachId: outreach.id,
          draftText: emailContent,
          linkedinDraft: linkedinContent,
          followupDraft: followupContent,
          status: "approved",
        }),
      });
      setStatus("approved");
      setSaveMsg("Approved ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkSent() {
    if (!outreach) return;

    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}/outreach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreachId: outreach.id,
          draftText: emailContent,
          status: "sent",
        }),
      });
      setStatus("sent");
      setSaveMsg("Marked as Sent ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: OutreachTab; label: string; icon: React.ReactNode }[] = [
    { key: "email", label: "Cold Email", icon: <Mail className="h-3.5 w-3.5" /> },
    { key: "linkedin", label: "LinkedIn", icon: <MessagesSquare className="h-3.5 w-3.5" /> },
    { key: "followup", label: "Follow-Up", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/60">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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

        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className="text-xs text-emerald-400 font-medium">{saveMsg}</span>
          )}
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              status === "sent"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : status === "approved"
                ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Subject line (email only) */}
      {activeTab === "email" && outreach.emailSubject && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Subject: </span>
          {outreach.emailSubject}
        </div>
      )}

      {/* Content textarea */}
      <textarea
        id={`outreach-${activeTab}-${leadId}`}
        value={currentContent}
        onChange={(e) => setCurrentContent(e.target.value)}
        className="w-full min-h-[200px] rounded-xl border border-border bg-card/40 p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 transition-colors font-mono leading-relaxed"
        placeholder="Outreach content will appear here..."
      />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary/60 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>

        <div className="flex gap-2">
          {status !== "approved" && status !== "sent" && (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-medium hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Approve
            </button>
          )}
          {status !== "sent" && (
            <button
              onClick={handleMarkSent}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Mark Sent
            </button>
          )}
        </div>
      </div>

      {/* Signals referenced */}
      {outreach.signalsReferenced && outreach.signalsReferenced.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          Referenced signals:{" "}
          {outreach.signalsReferenced.map((s: any) => (
            <span key={s} className="font-medium text-primary/70 mr-1">{String(s).replace(/_/g, " ")}</span>
          ))}
        </div>
      )}
    </div>
  );
}
