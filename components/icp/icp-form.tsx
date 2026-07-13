"use client";

import React, { useState } from "react";
import { IcpRawInput } from "@/types/icp";
import { Search, Loader2 } from "lucide-react";

interface IcpFormProps {
  onSubmit: (data: IcpRawInput) => void;
  isLoading: boolean;
}

export function IcpForm({ onSubmit, isLoading }: IcpFormProps) {
  const [form, setForm] = useState<Partial<IcpRawInput>>({
    companyName: "",
    productDescription: "",
    industry: "",
    country: "US",
    targetMarket: "All",
    businessTypes: ["retailer"],
    employeeRange: "11-50",
    keywords: [],
    additionalNotes: "",
  });

  const [keywordInput, setKeywordInput] = useState("");

  const handleBusinessTypeChange = (type: any) => {
    const current = form.businessTypes || [];
    if (current.includes(type)) {
      setForm({ ...form, businessTypes: current.filter((t) => t !== type) });
    } else {
      setForm({ ...form, businessTypes: [...current, type] });
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = keywordInput.trim();
      if (tag && !(form.keywords || []).includes(tag)) {
        setForm({ ...form, keywords: [...(form.keywords || []), tag] });
      }
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setForm({ ...form, keywords: (form.keywords || []).filter((k) => k !== keyword) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      form.companyName &&
      form.productDescription &&
      form.industry &&
      form.country &&
      form.targetMarket &&
      form.businessTypes &&
      form.businessTypes.length > 0 &&
      form.employeeRange &&
      form.keywords &&
      form.keywords.length > 0
    ) {
      onSubmit(form as IcpRawInput);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-card border border-border p-6 md:p-8 rounded-xl shadow-lg">
      <div className="space-y-1.5 pb-4 border-b border-border">
        <h2 className="text-xl font-bold">Configure Ideal Customer Profile (ICP)</h2>
        <p className="text-muted-foreground text-xs">Define your target buyers and business description to guide the AI search agents.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="companyName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Company Name</label>
          <input
            id="companyName"
            type="text"
            required
            placeholder="e.g. Solace Activewear"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full text-sm bg-background border border-border rounded-lg px-3.5 py-2.5 focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="industry" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Industry</label>
          <input
            id="industry"
            type="text"
            required
            placeholder="e.g. Apparel & Fashion"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="w-full text-sm bg-background border border-border rounded-lg px-3.5 py-2.5 focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="productDescription" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Description & Pitch</label>
        <textarea
          id="productDescription"
          required
          rows={3}
          placeholder="Describe your product line, unique selling points, and what makes you different..."
          value={form.productDescription}
          onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
          className="w-full text-sm bg-background border border-border rounded-lg px-3.5 py-2.5 focus:border-primary focus:outline-none transition-colors resize-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="country" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Country</label>
          <select
            id="country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 focus:border-primary focus:outline-none transition-colors"
          >
            <option value="US">United States (US)</option>
            <option value="UK">United Kingdom (UK)</option>
            <option value="EU">European Union (EU)</option>
            <option value="CA">Canada (CA)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="targetMarket" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Market Tier</label>
          <select
            id="targetMarket"
            value={form.targetMarket}
            onChange={(e) => setForm({ ...form, targetMarket: e.target.value as any })}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 focus:border-primary focus:outline-none transition-colors"
          >
            <option value="All">All Tiers</option>
            <option value="SMB">SMB (Boutiques / Small retailers)</option>
            <option value="Mid-Market">Mid-Market (Regional stores)</option>
            <option value="Enterprise">Enterprise (National chains)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="employeeRange" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Buyer Company Size</label>
          <select
            id="employeeRange"
            value={form.employeeRange}
            onChange={(e) => setForm({ ...form, employeeRange: e.target.value as any })}
            className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2.5 focus:border-primary focus:outline-none transition-colors"
          >
            <option value="1-10">1-10 Employees</option>
            <option value="11-50">11-50 Employees</option>
            <option value="51-200">51-200 Employees</option>
            <option value="201-500">201-500 Employees</option>
            <option value="500+">500+ Employees</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Target Business Types</span>
        <div className="flex flex-wrap gap-4 pt-1">
          {["retailer", "distributor", "wholesaler", "reseller", "importer"].map((type) => {
            const isChecked = (form.businessTypes || []).includes(type as any);
            return (
              <label key={type} className="flex items-center gap-2 text-sm text-foreground select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleBusinessTypeChange(type)}
                  className="rounded border-border text-primary focus:ring-primary/20 bg-background"
                />
                <span className="capitalize">{type}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="keywords" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Keywords / Niches</label>
        <div className="w-full bg-background border border-border rounded-lg p-2 focus-within:border-primary transition-colors">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.keywords || []).map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="hover:text-foreground text-primary/70 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <input
            id="keywords"
            type="text"
            placeholder="Type keyword and press Enter or comma..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleAddKeyword}
            className="w-full text-sm bg-transparent border-0 focus:outline-none px-1 py-0.5"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="additionalNotes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Notes (Optional)</label>
        <textarea
          id="additionalNotes"
          rows={2}
          placeholder="Any specific instructions, competitors to look out for, or special campaign terms..."
          value={form.additionalNotes}
          onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
          className="w-full text-sm bg-background border border-border rounded-lg px-3.5 py-2.5 focus:border-primary focus:outline-none transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !(form.keywords && form.keywords.length > 0)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-lg hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg shadow-primary/10 text-sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing & Expanding Profile...
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            Generate Structured ICP
          </>
        )}
      </button>
    </form>
  );
}
