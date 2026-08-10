import type { FC } from 'hono/jsx';
import Layout from './layout';

interface SessionScore { sessionId: number; label: string; total: number; status: string }
interface PlayerPageProps {
  code: string;
  circleName: string;
  playerName: string;
  total: number;
  roundsPlayed: number;
  best: number;
  worst: number;
  sessionsPlayed: number;
  wins: number;
  sessionScores: SessionScore[];
}

const PlayerPage: FC<PlayerPageProps> = ({ code, circleName, playerName, total, roundsPlayed, best, worst, sessionsPlayed, wins, sessionScores }) => (
  <Layout title={`${playerName} — ${circleName}`}>
    <a href={`/c/${code}`} class="text-sm font-bold text-accent dark:text-[#0a84ff]">← {circleName}</a>
    <h1 class="mt-3 text-2xl font-extrabold">{playerName}</h1>

    <div class="mt-4 grid grid-cols-2 gap-3">
      {[
        { label: 'Total', value: total, color: total >= 0 ? 'text-good dark:text-[#30d158]' : 'text-bad dark:text-[#ff453a]' },
        { label: 'Rounds', value: roundsPlayed, color: '' },
        { label: 'Best Round', value: best > 0 ? `+${best}` : best, color: 'text-good dark:text-[#30d158]' },
        { label: 'Worst Round', value: worst, color: 'text-bad dark:text-[#ff453a]' },
        { label: 'Sessions', value: sessionsPlayed, color: '' },
        { label: 'Wins', value: wins, color: 'text-medalGold' },
      ].map((stat) => (
        <div class="rounded-xl border border-black/5 bg-surface-alt p-3 dark:border-white/10 dark:bg-[#161b22]">
          <p class="text-xs font-bold text-ink-muted dark:text-[#9da8b8]">{stat.label}</p>
          <p class={`mt-1 text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>

    {sessionScores.length > 0 && (
      <section class="mt-6">
        <h2 class="text-lg font-extrabold">Session History</h2>
        <div class="mt-3 space-y-2">
          {sessionScores.map((s) => (
            <a href={`/c/${code}/session/${s.sessionId}`} class="flex items-center justify-between rounded-xl border border-black/5 bg-surface-alt p-3 dark:border-white/10 dark:bg-[#161b22] hover:border-accent/30">
              <span class="font-bold">{s.label}</span>
              <span class={`font-extrabold ${s.total >= 0 ? 'text-good dark:text-[#30d158]' : 'text-bad dark:text-[#ff453a]'}`}>
                {s.total >= 0 ? `+${s.total}` : s.total}
              </span>
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

export default PlayerPage;
