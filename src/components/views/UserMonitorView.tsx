import { useState } from "react";
import { useUsers, useDetectMode, useGenerateEvent, useSetMode } from "@/hooks/use-api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { StatusDot } from "@/components/StatusDot";
import { formatTime } from "@/lib/format";
import type { User, SourceApp, ManualMode, GenerateEventResponse, DetectModeResponse } from "@/types/api";

const SOURCE_APPS: SourceApp[] = ["slack", "gmail", "github", "calendar", "youtube"];
const MANUAL_MODES: ManualMode[] = ["auto", "focus", "work", "meeting", "relax", "sleep"];

function UserExpandedPanel({ user }: { user: User }) {
  const [source, setSource] = useState<SourceApp>("github");
  const [message, setMessage] = useState("");
  const [notifResult, setNotifResult] = useState<GenerateEventResponse | null>(null);
  const [modeResult, setModeResult] = useState<DetectModeResponse | null>(null);

  const generateEvent = useGenerateEvent();
  const detectMode = useDetectMode();
  const setMode = useSetMode();

  function handleFireNotif() {
    if (!message.trim()) return;
    generateEvent.mutate(
      { user_id: user.id, source_app: source, message },
      { onSuccess: (data) => { setNotifResult(data); setMessage(""); } }
    );
  }

  function handleDetectMode() {
    detectMode.mutate(
      { user_id: user.id },
      { onSuccess: (data) => setModeResult(data) }
    );
  }

  return (
    <div className="text-xs space-y-3">
      {/* User info */}
      <div className="space-y-1">
        <div><span className="text-muted-foreground">Persona: </span>{user.persona_description}</div>
        {user.current_block && (
          <div className="font-mono text-muted-foreground">
            Block: {formatTime(user.current_block.start_time)} – {formatTime(user.current_block.end_time)}
          </div>
        )}
        {user.active_app && (
          <div className="font-mono text-muted-foreground">
            App active since: {formatTime(user.active_app.started_at)}
          </div>
        )}
      </div>

      {/* Mode controls */}
      <div className="border-t border-border pt-2 flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground">Manual mode:</span>
        <select
          className="h-6 text-xs px-1.5 border border-border rounded-sm bg-background font-mono"
          value={user.manual_mode}
          onChange={(e) => setMode.mutate({ userId: user.id, mode: e.target.value as ManualMode })}
        >
          {MANUAL_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {setMode.isPending && <span className="text-muted-foreground">saving…</span>}
        <button
          className="h-6 px-2 border border-border rounded-sm text-xs hover:bg-secondary font-mono ml-2"
          onClick={handleDetectMode}
          disabled={detectMode.isPending}
        >
          {detectMode.isPending ? "detecting…" : "Detect Mode"}
        </button>
        {modeResult && (
          <span className="font-mono">
            → <span className="text-primary">{modeResult.inferred_mode}</span>
            <span className="text-muted-foreground ml-2 max-w-xs truncate">{modeResult.ai_reason}</span>
          </span>
        )}
        {detectMode.isError && (
          <span className="text-status-block">{(detectMode.error as Error).message}</span>
        )}
      </div>

      {/* Fire notification */}
      <div className="border-t border-border pt-2 space-y-1.5">
        <div className="text-muted-foreground">Fire notification:</div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="h-6 text-xs px-1.5 border border-border rounded-sm bg-background font-mono"
            value={source}
            onChange={(e) => setSource(e.target.value as SourceApp)}
          >
            {SOURCE_APPS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="h-6 text-xs px-2 border border-border rounded-sm bg-background flex-1 min-w-[200px]"
            placeholder="Message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleFireNotif(); }}
          />
          <button
            className="h-6 px-3 border border-border rounded-sm text-xs hover:bg-secondary font-mono"
            onClick={handleFireNotif}
            disabled={generateEvent.isPending || !message.trim()}
          >
            {generateEvent.isPending ? "firing…" : "Fire"}
          </button>
        </div>
        {notifResult && (
          <div className="font-mono flex items-center gap-3 flex-wrap">
            <StatusDot decision={notifResult.decision} />
            <span className="text-muted-foreground">mode: <span className="text-foreground">{notifResult.inferred_mode}</span></span>
            <span className="text-muted-foreground">{notifResult.ai_priority}/{notifResult.ai_category}</span>
            <span className="text-muted-foreground truncate max-w-xs">{notifResult.ai_reason}</span>
          </div>
        )}
        {generateEvent.isError && (
          <div className="text-status-block">{(generateEvent.error as Error).message}</div>
        )}
      </div>
    </div>
  );
}

export function UserMonitorView() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: users, isLoading, error } = useUsers(true, autoRefresh ? 5000 : undefined);

  return (
    <div>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User Monitor</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Auto-refresh
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} className="scale-75" />
        </label>
      </div>

      {error ? (
        <div className="p-3 text-xs text-status-block">Error: {(error as Error).message}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-8 px-3 text-xs w-8"></TableHead>
              <TableHead className="h-8 px-3 text-xs">Name</TableHead>
              <TableHead className="h-8 px-3 text-xs">Role</TableHead>
              <TableHead className="h-8 px-3 text-xs">Notif. Pref</TableHead>
              <TableHead className="h-8 px-3 text-xs">Mode</TableHead>
              <TableHead className="h-8 px-3 text-xs">Active App</TableHead>
              <TableHead className="h-8 px-3 text-xs">App Category</TableHead>
              <TableHead className="h-8 px-3 text-xs">Current Block</TableHead>
              <TableHead className="h-8 px-3 text-xs">Block Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-xs text-muted-foreground">Loading…</TableCell></TableRow>
            ) : !users?.length ? (
              <TableRow><TableCell colSpan={9} className="text-xs text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <>
                  <TableRow
                    key={u.id}
                    className="text-xs cursor-pointer"
                    onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                  >
                    <TableCell className="px-3 py-1.5 text-muted-foreground">{expandedId === u.id ? "▾" : "▸"}</TableCell>
                    <TableCell className="px-3 py-1.5 font-medium">{u.name}</TableCell>
                    <TableCell className="px-3 py-1.5 font-mono">{u.role}</TableCell>
                    <TableCell className="px-3 py-1.5 font-mono">{u.notification_pref}</TableCell>
                    <TableCell className="px-3 py-1.5 font-mono">{u.manual_mode}</TableCell>
                    <TableCell className="px-3 py-1.5 font-mono">{u.active_app?.app_name ?? "—"}</TableCell>
                    <TableCell className="px-3 py-1.5 font-mono">{u.active_app?.app_category ?? "—"}</TableCell>
                    <TableCell className="px-3 py-1.5">{u.current_block?.title ?? "—"}</TableCell>
                    <TableCell className="px-3 py-1.5 font-mono">{u.current_block?.block_type ?? "—"}</TableCell>
                  </TableRow>
                  {expandedId === u.id && (
                    <TableRow key={`${u.id}-detail`} className="bg-secondary/30">
                      <TableCell colSpan={9} className="px-6 py-3">
                        <UserExpandedPanel user={u} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
