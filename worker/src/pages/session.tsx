import type { FC } from 'hono/jsx';
import Layout from './layout';

interface Player { id: number; name: string }
interface RoundScore { roundNumber: number; scores: { player: Player; change: number; total: number }[] }

interface SessionPageProps {
  code: string;
  circleName: string;
  sessionLabel: string;
  status: string;
  rounds: RoundScore[];
  players: Player[];
}

const SessionPage: FC<SessionPageProps> = ({ code, circleName, sessionLabel, status, rounds, players }) => (
  <Layout title={`${sessionLabel} — ${circleName}`}>
    <a href={`/c/${code}`} class="text-sm font-bold text-accent dark:text-[#0a84ff]">← {circleName}</a>

    <div class="mt-3 flex items-center gap-3">
      <h1 class="text-xl font-extrabold">{sessionLabel}</h1>
      <span class={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${status === 'active' ? 'bg-good/10 text-good dark:bg-[#30d158]/15 dark:text-[#30d158]' : 'bg-surface-fill text-ink-muted dark:bg-[#21262d] dark:text-[#9da8b8]'}`}>
        {status === 'active' ? 'LIVE' : 'DONE'}
      </span>
    </div>

    {rounds.length > 0 && (
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-fill text-left text-xs font-bold text-ink-muted dark:bg-[#21262d] dark:text-[#9da8b8]">
              <th class="sticky left-0 bg-surface-fill px-3 py-2 dark:bg-[#21262d]">Player</th>
              {rounds.map((r) => (
                <th class="px-3 py-2 text-center">R{r.roundNumber}</th>
              ))}
              <th class="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const lastRound = rounds[rounds.length - 1];
              const finalTotal = lastRound?.scores.find((s) => s.player.id === p.id)?.total ?? 0;
              return (
                <tr class="border-t border-black/5 dark:border-white/10">
                  <td class="sticky left-0 bg-surface px-3 py-2 font-bold dark:bg-[#0d1117]">
                    <a href={`/c/${code}/player/${p.id}`} class="text-accent dark:text-[#0a84ff] hover:underline">{p.name}</a>
                  </td>
                  {rounds.map((r) => {
                    const sc = r.scores.find((s) => s.player.id === p.id);
                    const change = sc?.change ?? 0;
                    return (
                      <td class={`px-3 py-2 text-center ${change > 0 ? 'text-good dark:text-[#30d158]' : change < 0 ? 'text-bad dark:text-[#ff453a]' : 'text-ink-faint dark:text-[#788496]'}`}>
                        {change > 0 ? `+${change}` : change}
                      </td>
                    );
                  })}
                  <td class={`px-3 py-2 text-right font-extrabold ${finalTotal >= 0 ? 'text-good dark:text-[#30d158]' : 'text-bad dark:text-[#ff453a]'}`}>
                    {finalTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    <footer class="mt-8 text-center text-xs text-ink-faint dark:text-[#788496]">
      Powered by RemiScore
    </footer>
  </Layout>
);

export default SessionPage;
