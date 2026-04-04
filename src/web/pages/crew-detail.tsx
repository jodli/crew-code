import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useConnection } from "../app.tsx";
import { PageSkeleton } from "../components/shared/skeleton.tsx";
import { useToast } from "../components/shared/toast.tsx";
import type { InboxMessage } from "../lib/api-client.ts";
import {
  destroyTeam,
  getAgentInbox,
  getCrewMessages,
  getTeam,
  sendMessage,
  startAgent,
  startTeam,
  stopAgent,
} from "../lib/api-client.ts";
import { useEventSource } from "../lib/use-event-source.ts";

export function CrewDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ name: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const connStatus = useConnection();

  const [selected, setSelected] = useState<number | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  const startAgentMutation = useMutation({
    mutationFn: ({ agent }: { agent: string }) => startAgent(params.name!, agent),
    onSuccess: (_, { agent }) => {
      queryClient.invalidateQueries({ queryKey: ["teams", params.name] });
      toast("success", `Started ${agent}`);
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Start failed"),
  });

  const stopAgentMutation = useMutation({
    mutationFn: ({ agent }: { agent: string }) => stopAgent(params.name!, agent),
    onSuccess: (_, { agent }) => {
      queryClient.invalidateQueries({ queryKey: ["teams", params.name] });
      toast("success", `Stopped ${agent}`);
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Stop failed"),
  });

  const startAllMutation = useMutation({
    mutationFn: () => startTeam(params.name!),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["teams", params.name] });
      toast("success", `Started ${result.started.length} agents`);
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Start all failed"),
  });

  const teamQuery = useQuery({
    queryKey: ["teams", params.name],
    queryFn: () => getTeam(params.name!),
    enabled: !!params.name,
  });

  const messagesQuery = useQuery({
    queryKey: ["teams", params.name, "messages"],
    queryFn: () => getCrewMessages(params.name!),
    enabled: !!teamQuery.data,
  });

  const selectedMember = selected !== null ? teamQuery.data?.members[selected] : null;

  const inboxQuery = useQuery({
    queryKey: ["teams", params.name, "agents", selectedMember?.name, "inbox"],
    queryFn: () => getAgentInbox(params.name!, selectedMember!.name),
    enabled: !!selectedMember && inboxOpen,
  });

  // SSE: live team status updates — also triggers inbox refetch when unread counts change
  useEventSource({
    url: params.name ? `/api/teams/${encodeURIComponent(params.name)}/stream` : null,
    events: {
      "team-update": (event) => {
        try {
          const data = JSON.parse(event.data);
          queryClient.setQueryData(["teams", params.name], data);
          if (selectedMember && data.members) {
            const updated = data.members.find((m: { name: string }) => m.name === selectedMember.name);
            if (updated && updated.unreadCount !== selectedMember.unreadCount) {
              queryClient.invalidateQueries({
                queryKey: ["teams", params.name, "agents", selectedMember.name, "inbox"],
              });
            }
          }
        } catch {
          /* ignore parse errors */
        }
      },
    },
  });

  // SSE: live crew channel messages
  const handleMessageSnapshot = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.setQueryData(["teams", params.name, "messages"], data);
      } catch {
        /* ignore parse errors */
      }
    },
    [queryClient, params.name],
  );

  const handleNewMessages = useCallback(
    (event: MessageEvent) => {
      try {
        const newMsgs: InboxMessage[] = JSON.parse(event.data);
        queryClient.setQueryData(["teams", params.name, "messages"], (old: unknown) => {
          const prev = old as
            | { team: string; messages: InboxMessage[]; totalCount: number; unreadCount: number }
            | undefined;
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, ...newMsgs],
            totalCount: prev.totalCount + newMsgs.length,
            unreadCount: prev.unreadCount + newMsgs.length,
          };
        });
      } catch {
        /* ignore parse errors */
      }
    },
    [queryClient, params.name],
  );

  useEventSource({
    url: params.name ? `/api/teams/${encodeURIComponent(params.name)}/messages/stream` : null,
    events: {
      snapshot: handleMessageSnapshot,
      message: handleNewMessages,
    },
  });

  if (teamQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (teamQuery.error && connStatus === "connected") {
    const message = teamQuery.error instanceof Error ? teamQuery.error.message : "Failed to load team";
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-text mb-2">Crew not found</h1>
        <p className="text-sm text-text-muted mb-4">{message}</p>
        <a href="/crews" className="text-sm text-accent hover:text-accent-hover transition-colors">
          Back to Crews
        </a>
      </div>
    );
  }

  const team = teamQuery.data;
  if (!team) return null;

  const members = team.members;
  const agent = selected !== null ? members[selected] : null;
  const running = members.filter((m) => m.processId !== undefined).length;
  const total = members.length;
  const allRunning = running === total;
  const allStopped = running === 0;

  const crewMessages = (messagesQuery.data?.messages ?? []).filter((m) => !isSystemMessage(m));
  const inboxMessages = (inboxQuery.data?.messages ?? []).filter((m) => !isSystemMessage(m));

  const selectAgent = (i: number) => {
    setSelected(i);
    setInboxOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-12 shrink-0 border-b border-border">
        <a href="/crews" className="text-sm text-text-muted hover:text-text transition-colors">
          Crews
        </a>
        <span className="text-text-muted/40">/</span>
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${allRunning ? "bg-success" : allStopped ? "border border-text-muted/30" : "bg-warning"}`}
        />
        <span className="text-sm font-semibold tracking-[-0.02em] text-text font-mono">{team.name}</span>
        <span
          className={`text-xs font-medium ${allRunning ? "text-success/70" : allStopped ? "text-text-muted" : "text-warning/70"}`}
        >
          {allStopped ? "stopped" : `${running}/${total} running`}
        </span>
        <div className="flex-1" />
        {!allRunning && (
          <button
            type="button"
            onClick={() => startAllMutation.mutate()}
            className="h-8 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover active:scale-[0.98] transition-all duration-150"
          >
            Start all
          </button>
        )}
        <DestroyButton teamName={params.name!} onDestroyed={() => navigate("/crews")} />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: agents + detail */}
        <div className="w-64 shrink-0 border-r border-border flex flex-col bg-bg">
          <div className="px-4 pt-4 pb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Agents</span>
          </div>

          <div className="flex-1 overflow-auto px-2">
            {members.map((m, i) => {
              const isRunning = m.processId !== undefined;
              return (
                <button
                  type="button"
                  key={m.agentId}
                  onClick={() => selectAgent(i)}
                  className={`group flex items-start gap-2.5 px-2.5 py-2.5 rounded-md cursor-pointer transition-colors duration-100 mb-0.5 w-full text-left ${
                    selected === i ? "bg-bg-active" : "hover:bg-bg-hover"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1.5 transition-colors duration-300 ${
                      isRunning ? "" : "border border-text-muted/30 bg-transparent"
                    }`}
                    style={isRunning ? { backgroundColor: m.color || "#565f89" } : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono truncate ${isRunning ? "text-text" : "text-text-muted"}`}>
                        {m.name}
                      </span>
                      <span className={`text-[11px] ${isRunning ? "text-success/60" : "text-text-muted/50"}`}>
                        {isRunning ? "running" : "stopped"}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {m.model || "default"} &middot; {m.agentType}
                    </div>
                    {m.unreadCount > 0 && (
                      <span className="text-xs text-accent mt-0.5 inline-block">{m.unreadCount} unread</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected agent detail */}
          {agent && (
            <div className="border-t border-border p-4 shrink-0">
              <div className="text-sm font-semibold text-text font-mono mb-2">{agent.name}</div>
              <div className="space-y-1 text-xs text-text-muted">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className={agent.processId !== undefined ? "text-success/70" : "text-text-muted"}>
                    {agent.processId !== undefined ? `running (PID ${agent.processId})` : "stopped"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="text-text-secondary font-mono">{agent.model || "default"}</span>
                </div>
                <div className="flex justify-between">
                  <span>CWD</span>
                  <span className="text-text-secondary font-mono truncate ml-4" title={agent.cwd}>
                    {agent.cwd}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (agent.processId !== undefined) {
                      stopAgentMutation.mutate({ agent: agent.name });
                    } else {
                      startAgentMutation.mutate({ agent: agent.name });
                    }
                  }}
                  className={`h-7 px-2.5 text-xs font-medium rounded-md transition-colors ${
                    agent.processId !== undefined
                      ? "text-error/70 border border-error/20 hover:bg-error/10"
                      : "text-bg bg-accent hover:bg-accent-hover"
                  }`}
                >
                  {agent.processId !== undefined ? "Stop" : "Start"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: crew channel (top) + agent inbox (bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Crew Channel — always visible, muted bg for read-only feel */}
          <div
            className={`flex flex-col overflow-hidden bg-bg ${agent && inboxOpen ? "flex-[3]" : "flex-1"}`}
            style={{ minHeight: 0 }}
          >
            <ChannelView messages={crewMessages} />
          </div>

          {/* Agent Inbox — shown when agent is selected */}
          {agent && inboxOpen && (
            <div
              className="flex-[2] flex flex-col overflow-hidden border-t-2 border-border"
              style={{ minHeight: 0, borderTopColor: agent.color || "var(--color-accent)" }}
            >
              <InboxView
                messages={inboxMessages}
                teamName={params.name!}
                agentName={agent.name}
                agentColor={agent.color}
                onClose={() => setInboxOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Crew Channel (read-only) ---

function ChannelView({ messages }: { messages: InboxMessage[] }) {
  const firstUnread = messages.findIndex((m) => !m.read);
  const { scrollRef, isLive, onScroll, scrollToBottom } = useAutoScroll(messages);
  const [live, setLive] = useState(true);

  const handleScroll = () => {
    onScroll();
    setLive(isLive.current);
  };

  const jumpToBottom = () => {
    scrollToBottom();
    setLive(true);
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">Crew channel</span>
          <span className="text-xs text-text-muted">{messages.length} messages</span>
        </div>
        {live ? (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live
          </div>
        ) : (
          <button
            type="button"
            onClick={jumpToBottom}
            className="flex items-center gap-1.5 text-xs text-warning/70 hover:text-warning transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning/50" />
            Paused — jump to latest
          </button>
        )}
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto px-5 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No messages yet. Agents will post here when they have updates.</p>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg, i) => (
              <div key={msg.timestamp}>
                {firstUnread === i && <UnreadSeparator />}
                <MessageRow msg={msg} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-1.5 border-t border-border shrink-0 text-[11px] text-text-muted/40 italic">
        read-only &mdash; agents post here
      </div>
    </>
  );
}

// --- Agent Inbox ---

function InboxView({
  messages,
  teamName,
  agentName,
  agentColor,
  onClose,
}: {
  messages: InboxMessage[];
  teamName: string;
  agentName: string;
  agentColor?: string;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inboxScroll = useAutoScroll(messages);
  const firstUnread = messages.findIndex((m) => !m.read);
  const unreadCount = messages.filter((m) => !m.read).length;

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendMessage(teamName, agentName, text, "crew"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamName, "agents", agentName, "inbox"] });
      queryClient.invalidateQueries({ queryKey: ["teams", teamName, "messages"] });
      toast("success", `Sent to ${agentName}`);
      setInput("");
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Send failed"),
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMutation.mutate(input.trim());
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Header — tinted with agent color */}
      <div
        className="flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${agentColor ? `${agentColor}20` : "var(--color-border)"}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: agentColor || "var(--color-accent)" }}
          />
          <span className="text-sm font-semibold text-text">
            <span className="font-mono">{agentName}</span>
            <span className="font-normal text-text-muted ml-1.5">inbox</span>
          </span>
          {unreadCount > 0 && (
            <span
              className="min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full text-[10px] font-medium px-1 text-bg"
              style={{ backgroundColor: agentColor || "var(--color-accent)" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-text-muted hover:text-text transition-colors px-1.5 py-0.5 rounded hover:bg-bg-hover"
          title="Close inbox"
        >
          &#10005;
        </button>
      </div>

      {/* Messages */}
      <div ref={inboxScroll.scrollRef} onScroll={inboxScroll.onScroll} className="flex-1 overflow-auto px-5 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted py-2">No messages yet. Send one below.</p>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg, i) => (
              <div key={msg.timestamp}>
                {firstUnread === i && <UnreadSeparator label="unread" />}
                <MessageRow msg={msg} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send input — visually distinct */}
      <div
        className="px-4 py-3 shrink-0 bg-bg-elevated/50"
        style={{ borderTop: `1px solid ${agentColor ? `${agentColor}15` : "var(--color-border)"}` }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder={`Message to ${agentName}...`}
            className="flex-1 h-9 px-3 text-sm bg-bg-surface border border-border rounded-md text-text placeholder:text-text-muted/40 focus:outline-none focus:border-border-focus transition-colors font-mono"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-9 px-4 text-sm font-medium rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all text-bg"
            style={{ backgroundColor: !input.trim() ? undefined : agentColor || "var(--color-accent)" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---

function isSystemMessage(msg: InboxMessage): boolean {
  try {
    const parsed = JSON.parse(msg.text);
    return parsed?.type === "idle_notification";
  } catch {
    return false;
  }
}

/** Auto-scroll to bottom when new messages arrive, unless user has scrolled up. */
function useAutoScroll(messages: InboxMessage[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLive = useRef(true);
  const prevCount = useRef(0);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Scroll on initial load and when new messages arrive (if live)
  useEffect(() => {
    const count = messages.length;
    if (count !== prevCount.current) {
      if (isLive.current) scrollToBottom();
      prevCount.current = count;
    }
  });

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 40;
    isLive.current = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  }, []);

  return { scrollRef, isLive, onScroll, scrollToBottom };
}

// --- Shared components ---

function MessageRow({ msg }: { msg: InboxMessage }) {
  const time = new Date(msg.timestamp);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");

  return (
    <div className="flex gap-2.5">
      <span className="text-xs font-mono text-text-muted shrink-0 pt-0.5 w-10">
        {hh}:{mm}
      </span>
      <div className="min-w-0">
        <span className="text-sm font-medium font-mono" style={{ color: msg.color || undefined }}>
          {msg.from}
        </span>
        <p className="text-sm text-text-secondary leading-relaxed">{msg.text}</p>
      </div>
    </div>
  );
}

function UnreadSeparator({ label = "new" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px bg-warning/25" />
      <span className="text-[11px] text-warning/60 font-medium">{label}</span>
      <div className="flex-1 h-px bg-warning/25" />
    </div>
  );
}

function DestroyButton({ teamName, onDestroyed }: { teamName: string; onDestroyed: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  const destroyMutation = useMutation({
    mutationFn: () => destroyTeam(teamName),
    onSuccess: () => {
      toast("success", "Team destroyed");
      onDestroyed();
    },
    onError: (err) => toast("error", err instanceof Error ? err.message : "Destroy failed"),
  });

  const handleClick = () => {
    if (confirming) {
      destroyMutation.mutate();
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`h-8 px-3 text-sm rounded-md transition-colors ${
        confirming
          ? "text-error font-medium bg-error/10 border border-error/20"
          : "text-text-muted border border-border hover:text-error/70 hover:border-error/20"
      }`}
    >
      {confirming ? "Confirm destroy?" : "Destroy"}
    </button>
  );
}
