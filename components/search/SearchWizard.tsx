"use client";

import React, { useState } from "react";
import { ArrowRight, ArrowLeft, Search, Package, Globe, Users, Tag, Sparkles } from "lucide-react";

interface SearchWizardProps {
  onSubmit: (params: {
    product: string;
    brand: string;
    country: string;
    targetCustomer: string;
    keywords: string[];
  }) => void;
  isLoading?: boolean;
}

const STEPS = [
  { key: "product", label: "Product / Category", icon: Package, placeholder: "e.g. Running shoes, Kitchen appliances, Luxury handbags" },
  { key: "brand", label: "Your Brand / Company", icon: Sparkles, placeholder: "e.g. Nike, KitchenAid, Pavrix" },
  { key: "country", label: "Target Country", icon: Globe, placeholder: "e.g. Canada, United Kingdom, Australia" },
  { key: "targetCustomer", label: "Target Customer Type", icon: Users, placeholder: "e.g. Sports retailers, Luxury boutiques, Department stores" },
  { key: "keywords", label: "Keywords", icon: Tag, placeholder: "e.g. wholesale buyers, retail chains, specialty stores" },
] as const;

type StepKey = typeof STEPS[number]["key"];

const COUNTRY_SUGGESTIONS = ["Canada", "United States", "United Kingdom", "Australia", "Germany", "France", "India", "Singapore"];
const CUSTOMER_SUGGESTIONS = ["Sports retailers", "Department stores", "Luxury boutiques", "E-commerce stores", "Specialty shops", "Distributors"];

export function SearchWizard({ onSubmit, isLoading = false }: SearchWizardProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<StepKey, string>>({
    product: "",
    brand: "",
    country: "",
    targetCustomer: "",
    keywords: "",
  });

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  function handleNext() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleSubmit() {
    onSubmit({
      product: values.product,
      brand: values.brand,
      country: values.country,
      targetCustomer: values.targetCustomer,
      keywords: values.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !isLast) handleNext();
    if (e.key === "Enter" && isLast) handleSubmit();
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-xs text-muted-foreground">{STEPS[step].label}</span>
        </div>
        <div className="h-1 w-full rounded-full bg-secondary">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`transition-all duration-300 rounded-full ${
                i === step
                  ? "h-2 w-6 bg-primary"
                  : i < step
                  ? "h-2 w-2 bg-primary/40"
                  : "h-2 w-2 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6 animate-slide-up" key={step}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{currentStep.label}</h3>
            <p className="text-xs text-muted-foreground">
              {step === 0 && "What product or category are you selling wholesale?"}
              {step === 1 && "Which brand or company are you representing?"}
              {step === 2 && "Which country are you targeting for buyers?"}
              {step === 3 && "What type of businesses are your ideal buyers?"}
              {step === 4 && "Add specific keywords to refine the search (comma-separated)"}
            </p>
          </div>
        </div>

        <input
          id={`wizard-${currentStep.key}`}
          type="text"
          value={values[currentStep.key]}
          onChange={(e) => setValues((v) => ({ ...v, [currentStep.key]: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder={currentStep.placeholder}
          autoFocus
          className="w-full rounded-xl border border-border bg-card/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-card transition-all"
        />

        {/* Suggestions */}
        {currentStep.key === "country" && (
          <div className="flex flex-wrap gap-2">
            {COUNTRY_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setValues((v) => ({ ...v, country: s }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  values.country === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {currentStep.key === "targetCustomer" && (
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setValues((v) => ({ ...v, targetCustomer: s }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  values.targetCustomer === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Review summary on last step */}
        {isLast && (
          <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Search Summary
            </p>
            {STEPS.slice(0, -1).map((s) => (
              <div key={s.key} className="flex items-center gap-3 text-sm">
                <s.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">{s.label}:</span>
                <span className="font-medium text-foreground truncate">
                  {values[s.key] || <em className="opacity-40">Not set</em>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={isFirst}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={isLoading || !values.product || !values.country}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Start Search
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!values[currentStep.key]}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
