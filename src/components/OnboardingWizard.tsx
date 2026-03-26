"use client";

import { useState } from "react";

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export default function OnboardingWizard({
  open,
  onClose,
  onCreated,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [founderName, setFounderName] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [founderPhone, setFounderPhone] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [vpsIp, setVpsIp] = useState("");

  if (!open) return null;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          industry: industry || undefined,
          founder_name: founderName || undefined,
          founder_email: founderEmail || undefined,
          founder_phone: founderPhone || undefined,
          gateway_url: gatewayUrl || undefined,
          gateway_token: gatewayToken || undefined,
          vps_ip: vpsIp || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create client");
      }
      onCreated(slug);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setStep(0);
    setName("");
    setIndustry("");
    setFounderName("");
    setFounderEmail("");
    setFounderPhone("");
    setGatewayUrl("");
    setGatewayToken("");
    setVpsIp("");
    setError(null);
  }

  const steps = [
    // Step 0: Client basics
    <div key="basics" className="space-y-4">
      <h3 className="font-serif text-lg font-semibold text-text-primary">
        New Client
      </h3>
      <p className="text-text-muted text-sm">
        Enter the client company details.
      </p>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Company Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Ground Coffee"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50"
        />
        {name && (
          <p className="text-text-dim text-xs mt-1 font-mono">
            slug: {slug}
          </p>
        )}
      </div>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Industry
        </label>
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="Specialty Coffee Roastery"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50"
        />
      </div>
    </div>,

    // Step 1: Founder details
    <div key="founder" className="space-y-4">
      <h3 className="font-serif text-lg font-semibold text-text-primary">
        Founder Details
      </h3>
      <p className="text-text-muted text-sm">
        Who is the primary contact at this company?
      </p>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Name
        </label>
        <input
          value={founderName}
          onChange={(e) => setFounderName(e.target.value)}
          placeholder="Dickon"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50"
        />
      </div>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Email
        </label>
        <input
          value={founderEmail}
          onChange={(e) => setFounderEmail(e.target.value)}
          placeholder="dickon@newgroundcoffee.com"
          type="email"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50"
        />
      </div>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Phone
        </label>
        <input
          value={founderPhone}
          onChange={(e) => setFounderPhone(e.target.value)}
          placeholder="+44 7700 000000"
          type="tel"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50"
        />
      </div>
    </div>,

    // Step 2: Infrastructure (optional for now, required for existing VPS)
    <div key="infra" className="space-y-4">
      <h3 className="font-serif text-lg font-semibold text-text-primary">
        Infrastructure
      </h3>
      <p className="text-text-muted text-sm">
        Connect to an existing VPS, or leave blank to provision later.
      </p>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Gateway URL
        </label>
        <input
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          placeholder="http://89.167.1.21:18789"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50 font-mono"
        />
      </div>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          Gateway Token
        </label>
        <input
          value={gatewayToken}
          onChange={(e) => setGatewayToken(e.target.value)}
          placeholder="Bearer token (if required)"
          type="password"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50 font-mono"
        />
      </div>
      <div>
        <label className="block text-text-secondary text-xs font-mono mb-1">
          VPS IP
        </label>
        <input
          value={vpsIp}
          onChange={(e) => setVpsIp(e.target.value)}
          placeholder="89.167.1.21"
          className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-terra/50 font-mono"
        />
      </div>
    </div>,
  ];

  const isLastStep = step === steps.length - 1;
  const canProceed = step === 0 ? name.trim().length > 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-surface border border-dark-border rounded-xl shadow-panel w-full max-w-md mx-4 p-6">
        {/* Step indicator */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-terra" : "bg-dark-border"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        {steps[step]}

        {/* Error */}
        {error && (
          <p className="mt-3 text-red-400 text-sm font-mono">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            onClick={step === 0 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={isLastStep ? handleSubmit : () => setStep(step + 1)}
            disabled={!canProceed || saving}
            className="px-4 py-2 bg-terra text-white text-sm font-medium rounded-lg hover:bg-terra-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : isLastStep ? "Create Client" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
