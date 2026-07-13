"use client";

import React, { useState } from "react";
import { LEAD_STATUS_VALUES, LeadStatus } from "@/lib/lead-status";

interface StatusSelectProps {
  leadId: string;
  currentStatus: string;
  onUpdate?: (newStatus: string) => void;
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  New: "text-blue-400",
  Qualified: "text-violet-400",
  Contacted: "text-amber-400",
  Meeting: "text-orange-400",
  Won: "text-emerald-400",
  Lost: "text-red-400",
  Archive: "text-zinc-400",
};

export function StatusSelect({ leadId, currentStatus, onUpdate, compact = false }: StatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as LeadStatus;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onUpdate?.(newStatus);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoading(false);
    }
  }

  const colorClass = STATUS_COLORS[status] ?? "text-zinc-400";

  return (
    <select
      id={`status-${leadId}`}
      value={status}
      onChange={handleChange}
      disabled={loading}
      className={`rounded-md border border-border bg-card text-xs font-medium focus-ring transition-opacity disabled:opacity-50 cursor-pointer ${colorClass} ${
        compact ? "px-2 py-1" : "px-3 py-1.5"
      }`}
      aria-label="Lead CRM Status"
    >
      {LEAD_STATUS_VALUES.map((s) => (
        <option key={s} value={s} className="bg-card text-foreground">
          {s}
        </option>
      ))}
    </select>
  );
}
