import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorBanner } from "../components/shared/error-banner.tsx";
import { CardSkeleton } from "../components/shared/skeleton.tsx";
import type { TeamDetail, TeamSummary } from "../lib/api-client.ts";
import { getTeam, getTeams } from "../lib/api-client.ts";

export function CrewsListPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const {
    data: teams,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const teamDetails = useQueries({
    queries: (teams ?? []).map((t) => ({
      queryKey: ["teams", t.name],
      queryFn: () => getTeam(t.name),
    })),
  });

  const detailMap = new Map<string, TeamDetail>();
  for (const result of teamDetails) {
    if (result.data) {
      detailMap.set(result.data.name, result.data);
    }
  }

  const teamList = teams ?? [];
  const filtered = teamList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.04em] text-text">Crews</h1>
          {!isLoading && !error && (
            <p className="text-sm text-text-muted mt-1">
              {filtered.length} deployed crew{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, n) => `skeleton-${n}`).map((key) => (
            <CardSkeleton key={key} />
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error instanceof Error ? error.message : "Failed to load crews"} />}

      {!isLoading && !error && (
        <>
          {teamList.length > 3 && (
            <input
              type="text"
              placeholder="Filter crews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 px-3 mb-6 text-sm bg-bg-surface border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-border-focus transition-colors"
            />
          )}

          <div className="space-y-3">
            {filtered.map((summary) => (
              <CrewCard
                key={summary.name}
                summary={summary}
                detail={detailMap.get(summary.name)}
                onClick={() => navigate(`/crews/${summary.name}`)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              {search ? (
                <p className="text-text-muted">Nothing matches "{search}".</p>
              ) : (
                <div>
                  <p className="text-text-muted mb-4">No crews deployed yet.</p>
                  <a
                    href="/"
                    className="inline-block h-9 px-4 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover transition-colors leading-9"
                  >
                    Deploy a blueprint
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CrewCard({ summary, detail, onClick }: { summary: TeamSummary; detail?: TeamDetail; onClick: () => void }) {
  const members = detail?.members ?? [];
  const running = members.filter((m) => m.processId !== undefined).length;
  const total = members.length || summary.memberCount;
  const allRunning = total > 0 && running === total;
  const allStopped = running === 0;
  const totalUnread = members.reduce((sum, m) => sum + m.unreadCount, 0);

  return (
    <div className="group bg-bg-surface border border-border rounded-lg hover:border-border-focus/30 transition-colors duration-150 relative">
      <button type="button" onClick={onClick} className="w-full text-left p-4 cursor-pointer">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {/* Status dot */}
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  allRunning
                    ? "bg-success shadow-[0_0_0_0_var(--color-success)] animate-[heartbeat_3s_ease-in-out_infinite]"
                    : allStopped
                      ? "border-2 border-text-muted/30 bg-transparent"
                      : "bg-warning"
                }`}
              />
              <h3 className="text-base font-semibold tracking-[-0.02em] text-text font-mono truncate">
                {summary.name}
              </h3>
              {/* Status badge */}
              <span
                className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                  allRunning
                    ? "text-success/80 bg-success/10"
                    : allStopped
                      ? "text-text-muted bg-bg-active"
                      : "text-warning/80 bg-warning/10"
                }`}
              >
                {allStopped ? "stopped" : `${running}/${total} running`}
              </span>
              {totalUnread > 0 && <span className="text-xs text-accent font-medium">{totalUnread} unread</span>}
            </div>
            {summary.description && (
              <p className="text-sm text-text-secondary mt-0.5 ml-5 line-clamp-1">{summary.description}</p>
            )}
          </div>
        </div>

        {/* Agent chips */}
        {members.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 ml-5">
            {members.map((member) => {
              const isRunning = member.processId !== undefined;
              return (
                <div
                  key={member.name}
                  className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-bg/60 px-2 py-1 rounded"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? "" : "opacity-30"}`}
                    style={{ backgroundColor: isRunning ? member.color || "#565f89" : undefined }}
                  />
                  {!isRunning && !member.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 border border-text-muted/30 -ml-[calc(0.5rem+2px+6px)]"
                      style={{ position: "relative" }}
                    />
                  )}
                  <span className={`font-mono ${isRunning ? "text-text-secondary" : "text-text-muted/60"}`}>
                    {member.name}
                  </span>
                  {member.unreadCount > 0 && (
                    <span className="min-w-[16px] h-4 inline-flex items-center justify-center rounded-full bg-accent/15 text-accent text-[10px] font-medium px-1">
                      {member.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </button>

      {/* Actions — positioned over the card, outside the main button */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100 shrink-0">
        {!allRunning && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="h-8 px-3 text-sm font-medium text-bg bg-accent rounded-md hover:bg-accent-hover active:scale-[0.98] transition-all duration-150"
          >
            Start all
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="h-8 px-3 text-sm text-text-muted rounded-md hover:text-text-secondary hover:bg-bg-hover transition-colors duration-100"
        >
          View
        </button>
      </div>
    </div>
  );
}
