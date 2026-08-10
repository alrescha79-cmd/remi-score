import type { FC } from 'hono/jsx';
import Layout from './layout';

interface Player { id: number; name: string }
interface LeaderboardEntry { player: Player; total: number; sessionsPlayed: number; wins: number }
interface SessionRow { id: number; label: string | null; status: string; created_at: string; completed_at: string | null; winnerName: string | null }
interface LiveScore { player: Player; total: number; rank: number; lastDelta: number | null; roundCount: number }

interface CirclePageProps {
  code: string;
  circleName: string;
  leaderboard: LeaderboardEntry[];
  live: LiveScore[] | null;
  liveSessionId: number | null;
  recentSessions: SessionRow[];
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

const CirclePage: FC<CirclePageProps> = ({ code, circleName, leaderboard, live, liveSessionId, recentSessions }) => (
  <Layout title={circleName} description={`Live scores and leaderboard for ${circleName}`}>
    <h1 class="text-2xl font-extrabold">{circleName}</h1>
    <p class="mt-1 text-sm text-ink-muted dark:text-[#9da8b8]">remiscore.{code}</p>

    {live && live.length > 0 && (
      <section class="mt-6">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 animate-pulse rounded-full bg-good dark:bg-[#30d158]" />
          <h2 class="text-lg font-extrabold">Live Session</h2>
        </div>
        <div class="mt-3 space-y-2">
          {live.map((entry) => (
            <div class="flex items-center justify-between rounded-xl border border-black/5 bg-surface-alt p-3 dark:border-white/10 dark:bg-[#161b22]">
              <div class="flex items-center gap-3">
                <span class="w-8 text-center text-sm font-extrabold">{medal(entry.rank)}</span>
                <span class="font-bold">{entry.player.name}</span>
              </div>
              <div class="text-right">
                <span class="text-lg font-extrabold">{entry.total}</span>
                {entry.lastDelta !== null && entry.lastDelta !== 0 && (
                  <span class={`ml-2 text-xs font-bold ${entry.lastDelta > 0 ? 'text-good dark:text-[#30d158]' : 'text-bad dark:text-[#ff453a]'}`}>
                    {entry.lastDelta > 0 ? '+' : ''}{entry.lastDelta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p class="mt-2 text-center text-xs text-ink-muted dark:text-[#9da8b8]">
          {live[0]?.roundCount ?? 0} rounds played
        </p>
        {liveSessionId && (
          <a href={`/c/${code}/session/${liveSessionId}`} class="mt-2 block text-center text-sm font-bold text-accent dark:text-[#0a84ff]">
            View details →
          </a>
        )}
      </section>
    )}

    {leaderboard.length > 0 && (
      <section class="mt-6">
        <h2 class="text-lg font-extrabold">Season Leaderboard</h2>
        <div class="mt-3 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-surface-fill text-left text-xs font-bold text-ink-muted dark:bg-[#21262d] dark:text-[#9da8b8]">
                <th class="px-3 py-2">#</th>
                <th class="px-3 py-2">Player</th>
                <th class="px-3 py-2 text-right">Total</th>
                <th class="px-3 py-2 text-right">W</th>
                <th class="px-3 py-2 text-right">GP</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.sort((a, b) => b.total - a.total).map((e, i) => (
                <tr class="border-t border-black/5 dark:border-white/10">
                  <td class="px-3 py-2 font-bold">{medal(i + 1)}</td>
                  <td class="px-3 py-2">
                    <a href={`/c/${code}/player/${e.player.id}`} class="font-bold text-accent dark:text-[#0a84ff] hover:underline">
                      {e.player.name}
                    </a>
                  </td>
                  <td class={`px-3 py-2 text-right font-extrabold ${e.total >= 0 ? 'text-good dark:text-[#30d158]' : 'text-bad dark:text-[#ff453a]'}`}>{e.total}</td>
                  <td class="px-3 py-2 text-right">{e.wins}</td>
                  <td class="px-3 py-2 text-right text-ink-muted dark:text-[#9da8b8]">{e.sessionsPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {recentSessions.length > 0 && (
      <section class="mt-6">
        <h2 class="text-lg font-extrabold">History</h2>
        <div class="mt-3 space-y-2">
          {recentSessions.map((s) => (
            <a href={`/c/${code}/session/${s.id}`} class="flex items-center justify-between rounded-xl border border-black/5 bg-surface-alt p-3 dark:border-white/10 dark:bg-[#161b22] hover:border-accent/30">
              <div>
                <span class="font-bold">{s.label ?? `Session #${s.id}`}</span>
                <span class="ml-2 text-xs text-ink-muted dark:text-[#9da8b8]">{s.created_at.slice(0, 10)}</span>
              </div>
              <div class="flex items-center gap-2">
                {s.winnerName && <span class="text-xs font-bold text-ink-muted dark:text-[#9da8b8]">{s.winnerName}</span>}
                <span class={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${s.status === 'active' ? 'bg-good/10 text-good dark:bg-[#30d158]/15 dark:text-[#30d158]' : 'bg-surface-fill text-ink-muted dark:bg-[#21262d] dark:text-[#9da8b8]'}`}>
                  {s.status === 'active' ? 'LIVE' : 'DONE'}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
    )}

    <footer class="mt-8 text-center text-xs text-ink-faint dark:text-[#788496]">
      Powered by RemiScore
    </footer>
  </Layout>
);

export default CirclePage;
