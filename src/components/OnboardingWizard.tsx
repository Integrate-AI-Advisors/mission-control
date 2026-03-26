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

  const inputClass =
    "w-full bg-dark-bg border border-dark-border rounded-card px-3 py-2.5 text-text-primary text-sm font-sans focus:outline-none focus:border-terra/50 transition-colors duration-300 placeholder:text-text-dim";
  const monoInputClass =
    "w-full bg-dark-bg border border-dark-border rounded-card px-3 py-2.5 text-text-primary text-sm font-mono focus:outline-none focus:border-terra/50 transition-colors duration-300 placeholder:text-text-dim";

  const steps = [
    // Step 0: Client basics
    <div key="basics" className="space-y-4">
      <p className="font-mono text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-terra">
        New Client
      </p>
      <h3 className="font-serif text-[1.15rem] text-text-primary">
        Company Details
      </h3>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Company Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Ground Coffee"
          className={inputClass}
        />
        {name && (
          <p className="font-mono text-[0.6rem] text-text-muted mt-1.5 leading-[1.6]">
            slug: {slug}
          </p>
        )}
      </div>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Industry
        </label>
        <input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="Specialty Coffee Roastery"
          className={inputClass}
        />
      </div>
    </div>,

    // Step 1: Founder details
    <div key="founder" className="space-y-4">
      <p className="font-mono text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-terra">
        Primary Contact
      </p>
      <h3 className="font-serif text-[1.15rem] text-text-primary">
        Founder Details
      </h3>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Name
        </label>
        <input
          value={founderName}
          onChange={(e) => setFounderName(e.target.value)}
          placeholder="Dickon"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Email
        </label>
        <input
          value={founderEmail}
          onChange={(e) => setFounderEmail(e.target.value)}
          placeholder="dickon@newgroundcoffee.com"
          type="email"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Phone
        </label>
        <input
          value={founderPhone}
          onChange={(e) => setFounderPhone(e.target.value)}
          placeholder="+44 7700 000000"
          type="tel"
          className={inputClass}
        />
      </div>
    </div>,

    // Step 2: Infrastructure
    <div key="infra" className="space-y-4">
      <p className="font-mono text-[0.6rem] font-semibold tracking-[0.2em] uppercase text-terra">
        Infrastructure
      </p>
      <h3 className="font-serif text-[1.15rem] text-text-primary">
        VPS Connection
      </h3>
      <p className="font-sans text-[0.88rem] text-text-muted leading-[1.7]">
        Connect to an existing VPS, or leave blank to provision later.
      </p>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Gateway URL
        </label>
        <input
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          placeholder="http://89.167.1.21:18789"
          className={monoInputClass}
        />
      </div>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          Gateway Token
        </label>
        <input
          value={gatewayToken}
          onChange={(e) => setGatewayToken(e.target.value)}
          placeholder="Bearer token (if required)"
          type="password"
          className={monoInputClass}
        />
      </div>
      <div>
        <label className="block font-mono text-[0.6rem] font-semibold text-terra uppercase tracking-[0.2em] mb-1.5">
          VPS IP
        </label>
        <input
          value={vpsIp}
          onChange={(e) => setVpsIp(e.target.value)}
          placeholder="89.167.1.21"
          className={monoInputClass}
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
      <div className="relative bg-dark-surface border border-dark-border rounded-panel shadow-panel w-full max-w-md mx-4 p-6">
        {/* Step indicator — terra progress bar */}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-terra" : "bg-dark-border"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        {steps[step]}

        {/* Error */}
        {error && (
          <p className="mt-3 text-brand-red text-sm font-mono">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <button
            onClick={step === 0 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-text-muted text-sm font-sans hover:text-text-secondary transition-colors duration-300"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={isLastStep ? handleSubmit : () => setStep(step + 1)}
            disabled={!canProceed || saving}
            className="px-5 py-2.5 bg-terra text-white text-sm font-sans font-medium rounded-card hover:bg-terra-light transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : isLastStep ? "Create Client" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
