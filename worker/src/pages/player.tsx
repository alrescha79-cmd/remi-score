/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { FC } from 'hono/jsx';
import Layout from './layout';

interface SessionScore { sessionId: number; label: string; total: number; status: string }
interface PlayerPageProps {
  code: string;
  circleName: string;
  playerName: string;
  total: number;
  seasonRank: number;
  roundsPlayed: number;
  best: number;
  worst: number;
  sessionsPlayed: number;
  wins: number;
  sessionScores: SessionScore[];
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

const PlayerPage: FC<PlayerPageProps> = ({ code, circleName, playerName, total, seasonRank, roundsPlayed, best, worst, sessionsPlayed, wins, sessionScores }) => (
  <Layout title={`${playerName} — ${circleName}`}>
    <div class="mb-4">
      <a
        href={`/c/${code}`}
        class="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow-brutal-sm hover:bg-bg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
      >
        ← Kembali ke {circleName}
      </a>
    </div>

    {/* Header Card */}
    <div class="rounded-xl border-2 border-ink bg-surface p-5 shadow-brutal mb-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full border-2 border-ink bg-primary/10 text-primary font-display font-extrabold text-xl flex items-center justify-center shadow-brutal-sm">
          {playerName.charAt(0).toUpperCase()}
        </div>
        <div>
          <span class="inline-block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-0.5">Profil Pemain</span>
          <h1 class="text-2xl font-extrabold font-display text-ink">{playerName}</h1>
        </div>
      </div>
      {seasonRank > 0 && (
        <div class="text-right">
          <span class="block text-[10px] font-extrabold uppercase tracking-wider text-muted mb-1">Peringkat Season</span>
          <span class={`inline-flex items-center gap-1.5 rounded-lg border-2 border-ink px-3 py-1.5 font-display font-extrabold shadow-brutal-sm text-sm ${seasonRank === 1 ? 'bg-secondary/15 text-secondary' : 'bg-bg text-ink'}`}>
            {seasonRank === 1 ? (
              <>
                <span class="text-base">👑</span>
                <span>Sang Raja</span>
              </>
            ) : (
              <>
                {seasonRank <= 3 && <span>{medal(seasonRank)}</span>}
                <span>#{seasonRank}</span>
              </>
            )}
          </span>
        </div>
      )}
    </div>

    {/* Stats Grid */}
    <div class="grid grid-cols-2 gap-3 mb-6">
      {[
        { label: 'Total Poin', value: total, color: total >= 0 ? 'text-good' : 'text-bad', icon: '🎯' },
        { label: 'Ronde Main', value: roundsPlayed, color: 'text-ink', icon: '🎲' },
        { label: 'Ronde Tergacor', value: best > 0 ? `+${best}` : best, color: 'text-good', icon: '⚡' },
        { label: 'Ronde Ter-Apes', value: worst, color: 'text-bad', icon: '💥' },
        { label: 'Sesi Main', value: sessionsPlayed, color: 'text-ink', icon: '📊' },
        { label: 'Kemenangan', value: `${wins} Sesi`, color: 'text-secondary', icon: '👑' },
      ].map((stat) => (
        <div class="rounded-xl border-2 border-ink bg-surface p-4 shadow-brutal">
          <div class="flex items-center justify-between text-xs font-bold text-muted mb-1">
            <span>{stat.label}</span>
            <span>{stat.icon}</span>
          </div>
          <p class={`text-xl font-extrabold font-display ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>

    {/* Session History */}
    {sessionScores.length > 0 && (
      <section class="mb-6">
        <h2 class="text-base font-extrabold font-display text-ink uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>📜</span> Track Record Sesi
        </h2>
        <div class="space-y-2.5">
          {sessionScores.map((s) => (
            <a
              href={`/c/${code}/session/${s.sessionId}`}
              class="flex items-center justify-between rounded-xl border-2 border-ink bg-surface p-3.5 shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              <span class="font-bold text-ink text-sm">{s.label}</span>
              <span class={`font-extrabold font-display text-base px-2 py-0.5 rounded border border-ink/20 ${s.total >= 0 ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'}`}>
                {s.total >= 0 ? `+${s.total}` : s.total}
              </span>
            </a>
          ))}
        </div>
      </section>
    )}

    <footer class="mt-8 text-center text-xs font-medium text-faint">
      Created by Tukang Kopek
    </footer>
  </Layout>
);

export default PlayerPage;
