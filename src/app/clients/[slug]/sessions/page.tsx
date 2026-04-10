import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { getSessions } from "@/lib/queries/sessions";
import { formatCurrency, formatRelativeTime, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, string> = {
  completed: "bg-brand-green/10 text-brand-green border-brand-green/20",
  running: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  failed: "bg-brand-red/10 text-brand-red border-brand-red/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string; role?: string; status?: string };
}) {
  const client = await getClient(params.slug);
  if (!client) notFound();

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const { data: sessions, count } = await getSessions({
    clientId: client.id,
    role: searchParams.role,
    status: searchParams.status,
    page,
    pageSize: 50,
  });

  const totalPages = Math.ceil(count / 50);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="brand-label">Session History</p>
        <p className="text-xs text-muted-foreground">{count} total sessions</p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="font-serif text-lg text-foreground">No sessions found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchParams.role || searchParams.status
              ? "Try adjusting your filters."
              : "Sessions will appear here when agents start running."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">Role</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">Trigger</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em]">Status</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Cost</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Tokens</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Duration</TableHead>
                  <TableHead className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className={cn(
                      "cursor-pointer hover:bg-secondary/50",
                      session.status === "failed" && "bg-brand-red/5"
                    )}
                  >
                    <TableCell className="text-sm">{session.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{session.trigger_type}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.06em]",
                          statusVariant[session.status] || statusVariant.cancelled
                        )}
                      >
                        {session.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(session.total_cost_usd)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {(session.input_tokens + session.output_tokens).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatDuration(session.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatRelativeTime(session.started_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`?page=${page - 1}${searchParams.role ? `&role=${searchParams.role}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`?page=${page + 1}${searchParams.role ? `&role=${searchParams.role}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
