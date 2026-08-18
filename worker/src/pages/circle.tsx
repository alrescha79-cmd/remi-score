/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { FC } from 'hono/jsx';
import Layout from './layout';

interface Player { id: number; name: string }
interface LeaderboardEntry { player: Player; total: number; sessionsPlayed: number; wins: number }
interface SessionRow { id: number; seq: number; label: string | null; status: string; created_at: string; completed_at: string | null; winnerName: string | null }
interface LiveScore { player: Player; total: number; rank: number; rankChange: 'up' | 'down' | 'same' | null; lastDelta: number | null; roundCount: number }

interface CirclePageProps {
  code: string;
  circleName: string;
  syncedAt?: string;
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

const CirclePage: FC<CirclePageProps> = ({ code, circleName, syncedAt, leaderboard, live, liveSessionId, recentSessions }) => (
  <Layout title={circleName} description={`Skor live dan klasemen untuk ${circleName}`} liveCode={code} syncedAt={syncedAt}>
    {/* Navigation to Home */}
    <div class="mb-4">
      <a
        href="/"
        class="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow-brutal-sm hover:bg-bg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
      >
        ← Beranda
      </a>
    </div>

    {/* Circle Header */}
    <div class="rounded-xl border-2 border-ink bg-surface p-5 shadow-brutal mb-6">
      <div class="flex items-center justify-between">
        <div>
          <span class="inline-block rounded-full bg-primary/10 border border-ink/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary mb-1">
            Tongkrongan Remi
          </span>
          <h1 class="text-3xl font-extrabold font-display text-ink tracking-tight">{circleName}</h1>
        </div>
        <div class="rounded-md border-2 border-ink bg-bg px-3 py-1.5 text-xs font-mono font-bold text-ink shadow-brutal-sm">
          {code}
        </div>
      </div>
    </div>

    {/* Live Session Banner */}
    {live && live.length > 0 && (
      <section class="mb-6 rounded-xl border-2 border-ink bg-surface p-5 shadow-brutal">
        <div class="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 animate-pulse rounded-full bg-good border border-ink" />
            <h2 class="text-base font-extrabold font-display text-ink uppercase tracking-wider">Arena Live</h2>
          </div>
          <span class="text-xs font-bold text-muted bg-bg px-2 py-1 rounded border border-ink/20">
            Ronde {live[0]?.roundCount ?? 0}
          </span>
        </div>

        <div class="space-y-2">
          {live.map((entry) => (
            <div class="flex items-center justify-between rounded-lg border-2 border-ink bg-bg p-3 shadow-brutal-sm">
              <div class="flex items-center gap-3">
                <span class="w-7 text-center text-sm font-extrabold">{medal(entry.rank)}</span>
                <span class="font-bold text-ink text-sm">{entry.player.name}</span>
                {entry.rankChange === 'up' && <span class="text-xs text-good">▲</span>}
                {entry.rankChange === 'down' && <span class="text-xs text-bad">▼</span>}
                {entry.rankChange === 'same' && <span class="text-xs text-muted">═</span>}
              </div>
              <div class="text-right">
                <span class="text-lg font-extrabold font-display text-ink">{entry.total}</span>
                {entry.lastDelta === null ? (
                  <span class="ml-2 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-ink/30 bg-bg text-muted">
                    AFK
                  </span>
                ) : entry.lastDelta !== 0 && (
                  <span class={`ml-2 text-xs font-extrabold px-1.5 py-0.5 rounded border border-ink/30 ${entry.lastDelta > 0 ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'}`}>
                    {entry.lastDelta > 0 ? '+' : ''}{entry.lastDelta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {liveSessionId && (
          <a
            href={`/c/${code}/session/${liveSessionId}`}
            class="mt-4 block rounded-md border-2 border-ink bg-primary px-4 py-2.5 text-center text-xs font-extrabold text-white shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            Lihat Detail Arena Live →
          </a>
        )}
      </section>
    )}

    {/* Season Leaderboard */}
    {leaderboard.length > 0 && (
      <section class="mb-6">
        <h2 class="text-base font-extrabold font-display text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🏆</span> Klasemen Sepuh Remi
        </h2>
        <div class="overflow-hidden rounded-xl border-2 border-ink bg-surface shadow-brutal">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-ink bg-bg text-left text-xs font-extrabold text-ink uppercase tracking-wider">
                <th class="px-3 py-2.5">#</th>
                <th class="px-3 py-2.5">Player</th>
                <th class="px-3 py-2.5 text-right">Total</th>
                <th class="px-3 py-2.5 text-right">Menang</th>
                <th class="px-3 py-2.5 text-right">Main</th>
              </tr>
            </thead>
            <tbody class="divide-y border-ink">
              {leaderboard.sort((a, b) => b.total - a.total).map((e, i) => (
                <tr class="hover:bg-bg/50 transition-colors">
                  <td class="px-3 py-2.5 font-bold text-xs">{medal(i + 1)}</td>
                  <td class="px-3 py-2.5">
                    <a href={`/c/${code}/player/${e.player.id}`} class="font-bold text-primary hover:underline">
                      {e.player.name}
                    </a>
                  </td>
                  <td class={`px-3 py-2.5 text-right font-extrabold font-display ${e.total >= 0 ? 'text-good' : 'text-bad'}`}>
                    {e.total}
                  </td>
                  <td class="px-3 py-2.5 text-right font-bold text-ink">{e.wins}</td>
                  <td class="px-3 py-2.5 text-right text-muted">{e.sessionsPlayed}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {/* Recent Sessions History */}
    {recentSessions.length > 0 && (
      <section class="mb-6">
        <h2 class="text-base font-extrabold font-display text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📜</span> Riwayat Tanding
        </h2>
        <div class="space-y-2.5">
          {recentSessions.map((s) => (
            <a
              href={`/c/${code}/session/${s.id}`}
              class="flex items-center justify-between rounded-xl border-2 border-ink bg-surface p-3.5 shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              <div>
                <span class="font-bold text-ink text-sm block">Sesi #{s.seq} {s.label ? `· ${s.label}` : ''}</span>
                <span class="text-xs text-muted font-mono">{s.created_at.slice(0, 10)}</span>
              </div>
              <div class="flex items-center gap-2">
                {s.winnerName && (
                  <span class="text-xs font-bold text-ink bg-bg px-2 py-0.5 rounded border border-ink/20">
                    👑 {s.winnerName}
                  </span>
                )}
                <span className={`rounded-full border border-ink px-2.5 py-0.5 text-[10px] font-extrabold ${s.status === 'active' ? 'bg-good text-white' : 'bg-bg text-muted'}`}>
                  {s.status === 'active' ? 'LIVE' : 'SELESAI'}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
    )}

    <p class="mb-6 text-center text-xs font-medium text-muted">
      💡 Klik nama player atau sesi untuk melihat detailnya
    </p>

    <footer class="mt-2 text-center text-xs font-medium text-faint">
      Created by Tukang Kopek
    </footer>
  </Layout>
);

export default CirclePage;
