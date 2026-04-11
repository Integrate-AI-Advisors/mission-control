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
  updated_at: string;
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
    webhookHint:
      "Paste this URL in Xero Developer \u2192 Webhooks \u2192 Add subscription",
  },
  klaviyo: {
    name: "Klaviyo",
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
    instructions: [
      "Go to your SKIO dashboard \u2192 Settings \u2192 API",
      "Copy your API key",
    ],
    fields: [{ key: "api_key", label: "API Key", type: "password" }],
    hasStoreDomain: false,
    webhookHint:
      "Add this URL as a webhook endpoint in your SKIO settings",
  },
};

const DEFAULT_PROVIDER: ProviderConfig = {
  name: "Unknown",
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
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => {
          const config = getProviderConfig(integration.provider);
          const isConnected = integration.status !== "not_connected";

          return (
            <div
              key={integration.id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg text-foreground">
                      {config.name}
                    </span>
                    <StatusBadge status={integration.status} />
                  </div>
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
              <WebhookUrl
                provider={integration.provider}
                token={integration.webhook_token}
              />
            </div>
          );
        })}
      </div>

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

              <WebhookUrl
                provider={activeIntegration.provider}
                token={activeIntegration.webhook_token}
              />

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
