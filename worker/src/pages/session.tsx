/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { FC } from 'hono/jsx';
import Layout from './layout';

interface Player { id: number; name: string }
interface RoundScore { roundNumber: number; scores: { player: Player; change: number | null; total: number }[] }

interface SessionPageProps {
  code: string;
  circleName: string;
  sessionSeq: number;
  sessionLabel: string;
  status: string;
  rounds: RoundScore[];
  players: Player[];
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

const SessionPage: FC<SessionPageProps> = ({ code, circleName, sessionSeq, sessionLabel, status, rounds, players }) => (
  <Layout title={`${sessionLabel} — ${circleName}`}>
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
      <div>
        <span class="inline-block rounded-full bg-secondary/10 border border-ink/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-secondary mb-1">
          Sesi #{sessionSeq}
        </span>
        <h1 class="text-2xl font-extrabold font-display text-ink">{sessionLabel}</h1>
      </div>
      <span class={`rounded-full border-2 border-ink px-3 py-1 text-xs font-extrabold shadow-brutal-sm ${status === 'active' ? 'bg-good text-white' : 'bg-bg text-muted'}`}>
        {status === 'active' ? '● LIVE' : '✓ SELESAI'}
      </span>
    </div>

    {rounds.length > 0 ? (
      <div class="overflow-x-auto rounded-xl border-2 border-ink bg-surface shadow-brutal mb-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-ink bg-bg text-left text-xs font-extrabold text-ink uppercase tracking-wider">
              <th class="px-3 py-3 w-10 text-center">#</th>
              <th class="sticky left-0 bg-bg px-4 py-3 font-bold border-r border-ink/20">Player</th>
              {rounds.map((r) => (
                <th class="px-3 py-3 text-center min-w-[50px]">R{r.roundNumber}</th>
              ))}
              <th class="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y border-ink">
            {players.map((p, i) => {
              const lastRound = rounds[rounds.length - 1];
              const finalTotal = lastRound?.scores.find((s) => s.player.id === p.id)?.total ?? 0;
              return (
                <tr class="hover:bg-bg/50 transition-colors">
                  <td class="px-3 py-3 font-bold text-xs text-center">{medal(i + 1)}</td>
                  <td class="sticky left-0 bg-surface px-4 py-3 font-bold text-ink border-r border-ink/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    <a href={`/c/${code}/player/${p.id}`} class="text-primary hover:underline">
                      {p.name}
                    </a>
                  </td>
                  {rounds.map((r) => {
                    const sc = r.scores.find((s) => s.player.id === p.id);
                    const change = sc ? sc.change : null;
                    return (
                      <td class="px-3 py-3 text-center font-mono text-xs">
                        {change === null ? (
                          <span class="inline-block px-1.5 py-0.5 rounded font-extrabold text-[10px] text-muted bg-bg border border-ink/20">
                            AFK
                          </span>
                        ) : (
                          <span class={`inline-block px-1.5 py-0.5 rounded font-extrabold ${change > 0 ? 'bg-good/15 text-good' : change < 0 ? 'bg-bad/15 text-bad' : 'text-faint'}`}>
                            {change > 0 ? `+${change}` : change}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td class={`px-4 py-3 text-right font-extrabold font-display ${finalTotal >= 0 ? 'text-good' : 'text-bad'}`}>
                    {finalTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <div class="rounded-xl border-2 border-ink bg-surface p-8 text-center shadow-brutal mb-6">
        <p class="text-sm font-bold text-muted">Belum ada ronde yang dimainkan pada sesi ini.</p>
      </div>
    )}

    <footer class="mt-8 text-center text-xs font-medium text-faint">
      Created by Tukang Kopek
    </footer>
  </Layout>
);

export default SessionPage;
