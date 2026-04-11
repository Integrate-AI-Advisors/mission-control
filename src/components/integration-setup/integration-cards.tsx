"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  connectIntegration,
  disconnectIntegration,
  testIntegration,
} from "@/lib/actions/integrations";

// --- Types ---

export interface SafeIntegration {
  id: string;
  client_id: string;
  provider: string;
  status: string;
  has_credentials: boolean;
  webhook_token: string;
  store_domain: string | null;
  health_checked_at: string | null;
  created_at: string;
}

interface ProviderField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
}

interface ProviderConfig {
  name: string;
  instructions: string[];
  fields: ProviderField[];
  hasStoreDomain: boolean;
  webhookHint: string;
  showWebhook?: boolean;
  priority: "critical" | "useful";
  agentRole: string;
}

type DialogMode =
  | { view: "closed" }
  | { view: "connect"; integration: SafeIntegration }
  | { view: "manage"; integration: SafeIntegration }
  | { view: "update"; integration: SafeIntegration }
  | { view: "confirm-disconnect"; integration: SafeIntegration };

// --- Provider Config ---

const PROVIDERS: Record<string, ProviderConfig> = {
  shopify: {
    name: "Shopify",
    priority: "critical",
    agentRole: "CEO, CFO, COO, CRO",
    instructions: [
      "Go to your Shopify admin (yourstore.myshopify.com/admin)",
      "Click Settings \u2192 Apps and sales channels \u2192 Develop apps",
      'Create an app called "IntegrateAI"',
      "Configure Admin API scopes: read_orders, read_products, read_customers, read_analytics",
      "Install the app and copy the Admin API access token",
    ],
    fields: [
      { key: "access_token", label: "Admin API Access Token", type: "password" },
    ],
    hasStoreDomain: true,
    webhookHint:
      "Paste this URL in Shopify Admin \u2192 Settings \u2192 Notifications \u2192 Webhooks",
  },
  stripe: {
    name: "Stripe",
    priority: "critical",
    agentRole: "CFO, CEO",
    instructions: [
      "Go to dashboard.stripe.com",
      "Click Developers \u2192 API keys",
      "Copy your Secret key (starts with sk_live_ or sk_test_)",
    ],
    fields: [{ key: "secret_key", label: "Secret Key", type: "password" }],
    hasStoreDomain: false,
    webhookHint:
      "Paste this URL in Stripe Dashboard \u2192 Developers \u2192 Webhooks \u2192 Add endpoint",
  },
  xero: {
    name: "Xero",
    priority: "critical",
    agentRole: "CFO, CEO",
    instructions: [
      "Go to developer.xero.com/app/manage",
      "Create a new app (type: Web app)",
      "Copy the Client ID and Client Secret",
      "Set redirect URI to: https://api.integrate-ai.uk/oauth/xero/callback",
    ],
    fields: [
      { key: "client_id", label: "Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  klaviyo: {
    name: "Klaviyo",
    priority: "critical",
    agentRole: "CMO, CRO",
    instructions: [
      "Go to klaviyo.com \u2192 Settings \u2192 API keys",
      "Create a new Private API key with Read access",
      "Copy the key",
    ],
    fields: [{ key: "api_key", label: "API Key", type: "password" }],
    hasStoreDomain: false,
    webhookHint:
      "Add this URL as a webhook endpoint in your Klaviyo settings",
  },
  skio: {
    name: "SKIO",
    priority: "critical",
    agentRole: "CRO, CFO",
    instructions: [
      "Go to your SKIO dashboard \u2192 Settings \u2192 API",
      "Copy your API key",
    ],
    fields: [{ key: "api_key", label: "API Key", type: "password" }],
    hasStoreDomain: false,
    webhookHint:
      "Add this URL as a webhook endpoint in your SKIO settings",
  },
  basecamp: {
    name: "Basecamp",
    priority: "useful",
    agentRole: "COO",
    instructions: [
      "Go to launchpad.37signals.com/integrations and sign in",
      "Click 'Register an application'",
      "Fill in app name ('IntegrateAI'), your website URL, and set Redirect URI to: https://api.integrate-ai.uk/oauth/basecamp/callback",
      "Copy the Client ID and Client Secret",
    ],
    fields: [
      { key: "client_id", label: "Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  cropster: {
    name: "Cropster",
    priority: "useful",
    agentRole: "COO",
    instructions: [
      "Log in to Cropster at c-sar.cropster.com",
      "Go to Settings \u2192 API (or contact Cropster support to request API access)",
      "Cropster will issue you a Group API Key and API Secret",
      "Copy both values",
    ],
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "api_secret", label: "API Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  dpd: {
    name: "DPD",
    priority: "useful",
    agentRole: "COO",
    instructions: [
      "Contact your DPD UK account manager or email api@dpd.co.uk to request API access",
      "DPD will provide you with a Username, Password, and Account Number",
      "Copy all three values",
    ],
    fields: [
      { key: "username", label: "DPD Username", type: "text" },
      { key: "password", label: "DPD Password", type: "password" },
      { key: "account_number", label: "Account Number", type: "text" },
    ],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  google_docs: {
    name: "Google Workspace",
    priority: "useful",
    agentRole: "COO, CEO",
    instructions: [
      "Go to console.cloud.google.com and create a project (or select existing)",
      "Go to APIs & Services \u2192 Library, enable: Google Docs API, Google Drive API, Google Sheets API",
      "Go to APIs & Services \u2192 Credentials \u2192 Create Credentials \u2192 OAuth client ID",
      "Choose 'Web application', set redirect URI to: https://api.integrate-ai.uk/oauth/google/callback",
      "Copy the Client ID and Client Secret",
    ],
    fields: [
      { key: "client_id", label: "Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  instagram: {
    name: "Instagram",
    priority: "useful",
    agentRole: "CMO",
    instructions: [
      "Go to developers.facebook.com and sign in with your Facebook account",
      "Click My Apps \u2192 Create App \u2192 choose 'Business' type",
      "In the app dashboard, find 'Instagram Graph API' and click Set Up",
      "Go to Settings \u2192 Basic to find your App ID and App Secret",
      "The Instagram account must be a Business account linked to a Facebook Page",
    ],
    fields: [
      { key: "app_id", label: "Meta App ID", type: "text" },
      { key: "app_secret", label: "Meta App Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint:
      "In Meta App Dashboard \u2192 Products \u2192 Webhooks \u2192 Instagram \u2192 Subscribe, then paste this URL",
  },
  lightspeed: {
    name: "Lightspeed",
    priority: "useful",
    agentRole: "COO, CFO",
    instructions: [
      "Go to developers.lightspeedhq.com and sign in",
      "Click Create App",
      "Set redirect URI to: https://api.integrate-ai.uk/oauth/lightspeed/callback",
      "Copy the Client ID and Client Secret",
    ],
    fields: [
      { key: "client_id", label: "Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint:
      "For Lightspeed eCom: go to admin \u2192 Settings \u2192 Webhooks and paste this URL",
  },
  office365: {
    name: "Microsoft 365",
    priority: "useful",
    agentRole: "COO, CEO",
    instructions: [
      "Go to entra.microsoft.com and sign in with your Microsoft 365 admin account",
      "Go to App registrations \u2192 New registration",
      "Set redirect URI to: https://api.integrate-ai.uk/oauth/microsoft/callback (type: Web)",
      "Copy the Application (client) ID and Directory (tenant) ID from the overview page",
      "Go to Certificates & secrets \u2192 New client secret \u2192 copy the secret value immediately",
      "Go to API permissions \u2192 Add Microsoft Graph permissions you need (e.g. Mail.Read, Calendars.ReadWrite)",
    ],
    fields: [
      { key: "client_id", label: "Application (Client) ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
      { key: "tenant_id", label: "Directory (Tenant) ID", type: "text" },
    ],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  pipedrive: {
    name: "Pipedrive",
    priority: "critical",
    agentRole: "CMO, CRO, CEO",
    instructions: [
      "Log in to Pipedrive at app.pipedrive.com",
      "Click your profile icon (top-right) \u2192 Personal preferences",
      "Go to the API tab",
      "Copy your Personal API token",
    ],
    fields: [
      { key: "api_token", label: "Personal API Token", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint:
      "In Pipedrive: Settings \u2192 Tools and integrations \u2192 Webhooks \u2192 Create new webhook, then paste this URL",
  },
  planoly: {
    name: "Planoly",
    instructions: [
      "Planoly does not currently offer a public API",
      "Social media scheduling data can be accessed through Instagram and TikTok integrations instead",
      "If you need Planoly data specifically, contact IntegrateAI support",
    ],
    fields: [],
    hasStoreDomain: false,
    webhookHint: "",
    showWebhook: false,
  },
  royal_mail: {
    name: "Royal Mail",
    priority: "useful",
    agentRole: "COO",
    instructions: [
      "Go to developer.royalmail.net and register a developer account (requires business details)",
      "Once approved, go to My Apps \u2192 Create Application",
      "Select the API products you need (Shipping API, Tracking API)",
      "After approval, copy your Client ID and Client Secret from the app detail page",
      "Note: approval can take several business days",
    ],
    fields: [
      { key: "client_id", label: "Client ID", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint:
      "Royal Mail Tracking push notifications are configured in the developer portal under your app settings",
  },
  slack: {
    name: "Slack",
    priority: "useful",
    agentRole: "All agents",
    instructions: [
      "Go to api.slack.com/apps \u2192 Create New App \u2192 From scratch",
      "Give it a name and select your workspace",
      "Go to OAuth & Permissions \u2192 add Bot Token Scopes (chat:write, channels:read, channels:history)",
      "Click Install to Workspace and authorize",
      "Copy the Bot User OAuth Token (starts with xoxb-)",
      "Go to Basic Information \u2192 copy the Signing Secret",
    ],
    fields: [
      { key: "bot_token", label: "Bot Token (xoxb-...)", type: "password" },
      { key: "signing_secret", label: "Signing Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint:
      "In Slack App Dashboard \u2192 Event Subscriptions \u2192 toggle ON \u2192 paste this URL as the Request URL",
  },
  tiktok: {
    name: "TikTok",
    priority: "useful",
    agentRole: "CMO",
    instructions: [
      "Go to developers.tiktok.com \u2192 Manage apps \u2192 Create a new app",
      "Choose the products you need (Content Posting API, Marketing API, etc.)",
      "Fill in app details, privacy policy URL, and terms of service URL",
      "Submit for review (TikTok manually reviews all apps \u2014 can take days)",
      "Once approved, copy your Client Key and Client Secret",
    ],
    fields: [
      { key: "client_key", label: "Client Key (App ID)", type: "text" },
      { key: "client_secret", label: "Client Secret", type: "password" },
    ],
    hasStoreDomain: false,
    webhookHint:
      "In TikTok Developer app settings \u2192 Webhooks section \u2192 add this as your Callback URL",
  },
  wordpress: {
    name: "WordPress",
    priority: "useful",
    agentRole: "CMO",
    instructions: [
      "Log in to your WordPress admin at yoursite.com/wp-admin",
      "Go to Users \u2192 Profile, scroll down to Application Passwords",
      "Enter 'IntegrateAI' as the application name",
      "Click Add New Application Password and copy it immediately (shown only once)",
      "If using WooCommerce: go to WooCommerce \u2192 Settings \u2192 Advanced \u2192 REST API \u2192 Add key",
    ],
    fields: [
      { key: "username", label: "WordPress Username", type: "text" },
      { key: "application_password", label: "Application Password", type: "password" },
    ],
    hasStoreDomain: true,
    webhookHint:
      "For WooCommerce: go to WooCommerce \u2192 Settings \u2192 Advanced \u2192 Webhooks \u2192 Add webhook, then paste this URL",
  },
};

const DEFAULT_PROVIDER: ProviderConfig = {
  name: "Unknown",
  priority: "useful",
  agentRole: "",
  instructions: [],
  fields: [{ key: "api_key", label: "API Key", type: "password" }],
  hasStoreDomain: false,
  webhookHint:
    "Add this URL as a webhook endpoint in your provider's settings",
};

function getProviderConfig(provider: string): ProviderConfig {
  return PROVIDERS[provider.toLowerCase()] || {
    ...DEFAULT_PROVIDER,
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
  };
}

// --- Status helpers ---

const STATUS_STYLES: Record<string, { dot: string; label: string; bg: string }> = {
  healthy: { dot: "bg-brand-green", label: "Connected", bg: "bg-brand-green/10 text-brand-green" },
  degraded: { dot: "bg-brand-amber", label: "Degraded", bg: "bg-brand-amber/10 text-brand-amber" },
  down: { dot: "bg-brand-red", label: "Down", bg: "bg-brand-red/10 text-brand-red" },
  not_connected: { dot: "bg-muted-foreground", label: "Not Connected", bg: "bg-secondary text-muted-foreground" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.not_connected;
}

export function buildWebhookUrl(provider: string, token: string): string {
  return `https://api.integrate-ai.uk/webhooks/${provider}/${token}`;
}

// --- Components ---

function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em]",
        style.bg
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

function WebhookUrl({ provider, token }: { provider: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const url = buildWebhookUrl(provider, token);
  const config = getProviderConfig(provider);

  return (
    <div className="mt-3 rounded-md bg-secondary/50 p-3">
      <p className="brand-label mb-1">Webhook URL</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate font-mono text-xs text-foreground">
          {url}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{config.webhookHint}</p>
    </div>
  );
}

function CredentialForm({
  provider,
  onSubmit,
  pending,
  submitLabel,
}: {
  provider: string;
  onSubmit: (credentials: Record<string, string>, storeDomain?: string) => void;
  pending: boolean;
  submitLabel: string;
}) {
  const config = getProviderConfig(provider);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [storeDomain, setStoreDomain] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values, config.hasStoreDomain ? storeDomain : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {config.fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label className="text-sm">{field.label}</Label>
          <div className="relative">
            <Input
              type={
                field.type === "password" && !showFields[field.key]
                  ? "password"
                  : "text"
              }
              placeholder={field.placeholder}
              value={values[field.key] || ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              required
            />
            {field.type === "password" && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setShowFields((prev) => ({
                    ...prev,
                    [field.key]: !prev[field.key],
                  }))
                }
              >
                {showFields[field.key] ? "Hide" : "Show"}
              </button>
            )}
          </div>
        </div>
      ))}
      {config.hasStoreDomain && (
        <div className="space-y-1.5">
          <Label className="text-sm">Store Domain</Label>
          <Input
            type="text"
            placeholder="yourstore.myshopify.com"
            value={storeDomain}
            onChange={(e) => setStoreDomain(e.target.value)}
            required
          />
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Connecting..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

// --- Main component ---

export function IntegrationCards({
  integrations,
}: {
  integrations: SafeIntegration[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogMode>({ view: "closed" });
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    status?: string;
    error?: string;
  } | null>(null);

  const close = () => {
    setDialog({ view: "closed" });
    setActionError(null);
    setTestResult(null);
  };

  const handleConnect = (
    integration: SafeIntegration,
    credentials: Record<string, string>,
    storeDomain?: string
  ) => {
    setActionError(null);
    startTransition(async () => {
      const result = await connectIntegration(
        integration.id,
        credentials,
        storeDomain
      );
      if (result.error) {
        setActionError(result.error);
      } else {
        close();
        router.refresh();
      }
    });
  };

  const handleDisconnect = (integration: SafeIntegration) => {
    setActionError(null);
    startTransition(async () => {
      const result = await disconnectIntegration(integration.id);
      if (result.error) {
        setActionError(result.error);
      } else {
        close();
        router.refresh();
      }
    });
  };

  const handleTest = (integration: SafeIntegration) => {
    setTestResult(null);
    setActionError(null);
    startTransition(async () => {
      const result = await testIntegration(integration.id);
      if (result.error) {
        setTestResult({ error: result.error, status: result.status });
      } else {
        setTestResult({ status: result.status });
        router.refresh();
      }
    });
  };

  const activeIntegration =
    dialog.view !== "closed" ? dialog.integration : null;
  const activeConfig = activeIntegration
    ? getProviderConfig(activeIntegration.provider)
    : null;

  return (
    <>
      {/* Critical integrations first, then useful */}
      {(["critical", "useful"] as const).map((tier) => {
        const tierIntegrations = integrations.filter(
          (i) => getProviderConfig(i.provider).priority === tier
        );
        if (tierIntegrations.length === 0) return null;
        return (
          <div key={tier} className="space-y-3">
            <h3 className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              tier === "critical" ? "text-brand-red" : "text-muted-foreground"
            )}>
              {tier === "critical" ? "Critical — Connect First" : "Useful — Connect When Ready"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
      {tierIntegrations.map((integration) => {
          const config = getProviderConfig(integration.provider);
          const isConnected = integration.has_credentials && integration.status !== "not_connected";

          return (
            <div
              key={integration.id}
              className={cn(
                "rounded-lg border p-4",
                tier === "critical" ? "border-brand-red/30" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg text-foreground">
                      {config.name}
                    </span>
                    <StatusBadge status={integration.status} />
                  </div>
                  {config.agentRole && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Used by: {config.agentRole}
                    </p>
                  )}
                  {integration.store_domain && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {integration.store_domain}
                    </p>
                  )}
                </div>
                <Button
                  variant={isConnected ? "outline" : "default"}
                  size="sm"
                  onClick={() =>
                    setDialog({
                      view: isConnected ? "manage" : "connect",
                      integration,
                    })
                  }
                >
                  {isConnected ? "Manage" : "Connect"}
                </Button>
              </div>
              {getProviderConfig(integration.provider).showWebhook !== false && (
                <WebhookUrl
                  provider={integration.provider}
                  token={integration.webhook_token}
                />
              )}
            </div>
          );
        })}
            </div>
          </div>
        );
      })}

      {/* Shared dialog */}
      <Dialog
        open={dialog.view !== "closed"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {/* --- Connect view --- */}
          {dialog.view === "connect" && activeIntegration && activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">
                  Connect {activeConfig.name}
                </DialogTitle>
                <DialogDescription>
                  Follow these steps to connect your {activeConfig.name}{" "}
                  account.
                </DialogDescription>
              </DialogHeader>

              {activeConfig.instructions.length > 0 ? (
                <ol className="list-inside list-decimal space-y-1.5 text-sm text-foreground">
                  {activeConfig.instructions.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Contact IntegrateAI support for setup instructions for this
                  provider.
                </p>
              )}

              {actionError && (
                <p className="text-sm text-brand-red">{actionError}</p>
              )}

              <CredentialForm
                provider={activeIntegration.provider}
                pending={pending}
                submitLabel="Connect"
                onSubmit={(creds, domain) =>
                  handleConnect(activeIntegration, creds, domain)
                }
              />
            </>
          )}

          {/* --- Manage view --- */}
          {dialog.view === "manage" && activeIntegration && activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">
                  Manage {activeConfig.name}
                </DialogTitle>
                <DialogDescription>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge status={activeIntegration.status} />
                    {activeIntegration.health_checked_at && (
                      <span className="text-xs text-muted-foreground">
                        Last checked{" "}
                        {formatRelativeTime(
                          activeIntegration.health_checked_at
                        )}
                      </span>
                    )}
                  </span>
                </DialogDescription>
              </DialogHeader>

              {activeIntegration.store_domain && (
                <p className="text-sm text-muted-foreground">
                  {activeIntegration.store_domain}
                </p>
              )}

              {activeConfig.showWebhook !== false && (
                <WebhookUrl
                  provider={activeIntegration.provider}
                  token={activeIntegration.webhook_token}
                />
              )}

              {testResult && (
                <div
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    testResult.error
                      ? "bg-brand-red/10 text-brand-red"
                      : "bg-brand-green/10 text-brand-green"
                  )}
                >
                  {testResult.error
                    ? `Test failed: ${testResult.error}`
                    : `Connection healthy (${testResult.status})`}
                </div>
              )}

              {actionError && (
                <p className="text-sm text-brand-red">{actionError}</p>
              )}

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleTest(activeIntegration)}
                >
                  {pending ? "Testing..." : "Test Connection"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDialog({ view: "update", integration: activeIntegration })
                  }
                >
                  Update Credentials
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setDialog({
                      view: "confirm-disconnect",
                      integration: activeIntegration,
                    })
                  }
                >
                  Disconnect
                </Button>
              </DialogFooter>
            </>
          )}

          {/* --- Update credentials view --- */}
          {dialog.view === "update" && activeIntegration && activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">
                  Update {activeConfig.name} Credentials
                </DialogTitle>
                <DialogDescription>
                  Credentials are currently set. Enter new credentials below to
                  replace them.
                </DialogDescription>
              </DialogHeader>

              {activeConfig.instructions.length > 0 && (
                <ol className="list-inside list-decimal space-y-1.5 text-sm text-foreground">
                  {activeConfig.instructions.map((step, i) => (
                    <li key={i} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              )}

              {actionError && (
                <p className="text-sm text-brand-red">{actionError}</p>
              )}

              <CredentialForm
                provider={activeIntegration.provider}
                pending={pending}
                submitLabel="Update Credentials"
                onSubmit={(creds, domain) =>
                  handleConnect(activeIntegration, creds, domain)
                }
              />
            </>
          )}

          {/* --- Disconnect confirmation --- */}
          {dialog.view === "confirm-disconnect" && activeIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">
                  Disconnect{" "}
                  {getProviderConfig(activeIntegration.provider).name}?
                </DialogTitle>
                <DialogDescription>
                  This will remove all stored credentials. You will need to
                  re-enter them to reconnect.
                </DialogDescription>
              </DialogHeader>

              {actionError && (
                <p className="text-sm text-brand-red">{actionError}</p>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setDialog({
                      view: "manage",
                      integration: activeIntegration,
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => handleDisconnect(activeIntegration)}
                >
                  {pending ? "Disconnecting..." : "Disconnect"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
