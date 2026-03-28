import { useState } from "react";
import { useDecisions, useUsers, useClassify, useDecisionLookup } from "@/hooks/use-api";
import { StatusDot } from "@/components/StatusDot";
import { formatTimestamp } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Decision, InferredMode, Priority, ClassifyResponse, DecisionLookupResponse } from "@/types/api";

export function DashboardView() {
  const { data: decisions, isLoading: loadingD, error: errorD } = useDecisions(15000);
  const { data: users, isLoading: loadingU } = useUsers(true, 15000);

  const today = new Date().toISOString().slice(0, 10);
  const todayDecisions = decisions?.filter((d) => d.created_at.startsWith(today)) ?? [];

  const counts: Record<Decision, number> = { send: 0, delay: 0, block: 0 };
  todayDecisions.forEach((d) => counts[d.decision]++);

  const modeDistribution: Record<string, number> = {};
  if (decisions) {
    decisions.forEach((d) => {
      modeDistribution[d.inferred_mode] = (modeDistribution[d.inferred_mode] || 0) + 1;
    });
  }

  const recent = decisions?.slice(0, 10) ?? [];

  return (
    <div className="space-y-0">
      {/* Stats Row */}
      <div className="grid grid-cols-5 border-b border-border">
        <StatCell label="Total Decisions Today" value={todayDecisions.length} loading={loadingD} />
        <StatCell label="Sent" value={counts.send} loading={loadingD} dotColor="text-status-send" />
        <StatCell label="Delayed" value={counts.delay} loading={loadingD} dotColor="text-status-delay" />
        <StatCell label="Blocked" value={counts.block} loading={loadingD} dotColor="text-status-block" />
        <StatCell label="Active Users" value={users?.length ?? 0} loading={loadingU} />
      </div>

      <div className="grid grid-cols-3">
        {/* Recent Decisions */}
        <div className="col-span-2 border-r border-border">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Decisions</span>
          </div>
          {errorD ? (
            <div className="p-3 text-xs text-status-block">Error: {(errorD as Error).message}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-8 px-3 text-xs">Time</TableHead>
                  <TableHead className="h-8 px-3 text-xs">User</TableHead>
                  <TableHead className="h-8 px-3 text-xs">Source</TableHead>
                  <TableHead className="h-8 px-3 text-xs">Message</TableHead>
                  <TableHead className="h-8 px-3 text-xs">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingD ? (
                  <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">Loading…</TableCell></TableRow>
                ) : recent.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">No decisions yet</TableCell></TableRow>
                ) : (
                  recent.map((d) => (
                    <TableRow key={d.id} className="text-xs">
                      <TableCell className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{formatTimestamp(d.created_at)}</TableCell>
                      <TableCell className="px-3 py-1.5">{d.user_name}</TableCell>
                      <TableCell className="px-3 py-1.5 font-mono text-xs">{d.notification_source}</TableCell>
                      <TableCell className="px-3 py-1.5 max-w-[200px] truncate">{d.notification_message}</TableCell>
                      <TableCell className="px-3 py-1.5"><StatusDot decision={d.decision} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Mode Distribution */}
        <div>
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mode Distribution</span>
          </div>
          <div className="p-3 space-y-2">
            {(["focus", "work", "meeting", "relax", "sleep"] as InferredMode[]).map((mode) => {
              const count = modeDistribution[mode] || 0;
              const total = decisions?.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={mode} className="flex items-center gap-2 text-xs">
                  <span className="w-14 font-mono text-muted-foreground">{mode}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-sm overflow-hidden">
                    <div className="h-full bg-primary/40 rounded-sm" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Test Panels */}
      <div className="grid grid-cols-2 border-t border-border">
        <ClassifyPanel />
        <DecisionLookupPanel />
      </div>
    </div>
  );
}

function StatCell({ label, value, loading, dotColor }: { label: string; value: number; loading: boolean; dotColor?: string }) {
  return (
    <div className="px-4 py-3 border-r border-border last:border-r-0">
      <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
        {dotColor && <span className={`${dotColor} text-[10px] leading-none`}>●</span>}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{loading ? "—" : value}</div>
    </div>
  );
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "text-status-delay",
  medium: "text-yellow-500",
  high: "text-status-block",
};

function ClassifyPanel() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const classify = useClassify();

  function handle() {
    if (!message.trim()) return;
    classify.mutate({ message }, { onSuccess: (data) => setResult(data) });
  }

  return (
    <div className="border-r border-border p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Classify</div>
      <div className="flex gap-2">
        <input
          className="h-7 text-xs px-2 border border-border rounded-sm bg-background flex-1"
          placeholder="Enter notification message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handle(); }}
        />
        <button
          className="h-7 px-3 border border-border rounded-sm text-xs hover:bg-secondary whitespace-nowrap"
          onClick={handle}
          disabled={classify.isPending || !message.trim()}
        >
          {classify.isPending ? "…" : "Classify"}
        </button>
      </div>
      {result && (
        <div className="font-mono text-xs flex gap-4">
          <span>priority: <span className={PRIORITY_COLOR[result.priority]}>{result.priority}</span></span>
          <span>category: <span className="text-foreground">{result.category}</span></span>
        </div>
      )}
      {classify.isError && <div className="text-status-block text-xs">{(classify.error as Error).message}</div>}
    </div>
  );
}

function DecisionLookupPanel() {
  const [mode, setMode] = useState<InferredMode>("focus");
  const [priority, setPriority] = useState<Priority>("medium");
  const [result, setResult] = useState<DecisionLookupResponse | null>(null);
  const decisionLookup = useDecisionLookup();

  function handle() {
    decisionLookup.mutate({ priority, inferred_mode: mode }, { onSuccess: setResult });
  }

  return (
    <div className="p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Decision Lookup</div>
      <div className="flex gap-2 items-center">
        <select
          className="h-7 text-xs px-1.5 border border-border rounded-sm bg-background font-mono"
          value={mode}
          onChange={(e) => setMode(e.target.value as InferredMode)}
        >
          {(["focus", "work", "meeting", "relax", "sleep"] as InferredMode[]).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          className="h-7 text-xs px-1.5 border border-border rounded-sm bg-background font-mono"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          {(["low", "medium", "high"] as Priority[]).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button
          className="h-7 px-3 border border-border rounded-sm text-xs hover:bg-secondary"
          onClick={handle}
          disabled={decisionLookup.isPending}
        >
          Lookup
        </button>
      </div>
      {result && (
        <div className="font-mono text-xs flex items-center gap-4">
          <StatusDot decision={result.decision} />
          {result.delay_minutes > 0 && (
            <span className="text-muted-foreground">delay: {result.delay_minutes}min</span>
          )}
        </div>
      )}
      {decisionLookup.isError && <div className="text-status-block text-xs">{(decisionLookup.error as Error).message}</div>}
    </div>
  );
}
