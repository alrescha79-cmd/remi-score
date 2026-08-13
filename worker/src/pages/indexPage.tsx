/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { FC } from 'hono/jsx';
import Layout from './layout';

interface IndexPageProps {
  error?: string;
  searchedCode?: string;
}

const IndexPage: FC<IndexPageProps> = ({ error, searchedCode }) => (
  <Layout title="RemiScore — Dashboard Web Live" description="Pantau skor dan klasemen remi secara live">
    <div class="py-6 text-center">
      <div class="inline-block rounded-full bg-primary/10 border-2 border-ink px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary mb-3 shadow-brutal-sm">
        Papan Skor Remi Anti-Debat
      </div>
      <h1 class="text-4xl font-extrabold font-display text-ink tracking-tight">RemiScore</h1>
      <p class="mt-2 text-sm text-muted max-w-sm mx-auto leading-relaxed">
        Basecamp papan skor remi anti-debat. Pantau hasil pertandingan dan Klasemen Sepuh Remi secara live.
      </p>
    </div>

    <div class="mt-4 rounded-xl border-2 border-ink bg-surface p-5 shadow-brutal">
      <form method="get" action="/" class="space-y-4">
        <div>
          <label for="code" class="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
            Cari Tongkrongan (Kode Share)
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              id="code"
              name="code"
              value={searchedCode ?? ''}
              placeholder="misal abc234"
              maxlength={6}
              required
              class="w-full rounded-md border-2 border-ink bg-bg px-4 py-3 text-base font-mono font-bold tracking-widest text-ink placeholder:text-faint focus:border-primary focus:bg-white focus:outline-none focus:shadow-brutal-sm transition-all"
            />
            <button
              type="submit"
              class="rounded-md border-2 border-ink bg-primary px-6 py-3 text-sm font-extrabold text-white shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Cari Tongkrongan</span>
              <span>→</span>
            </button>
          </div>
        </div>
        {error && (
          <div class="rounded-md border-2 border-bad bg-bad/10 px-3 py-2 text-xs font-bold text-bad">
            ⚠️ {error}
          </div>
        )}
      </form>
    </div>

    <div class="mt-6 space-y-4 rounded-xl border-2 border-ink bg-surface p-5 shadow-brutal">
      <h2 class="text-base font-extrabold font-display text-ink uppercase tracking-wider flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 bg-secondary border border-ink rounded-full"></span>
        Fitur Utama
      </h2>
      <div class="grid gap-3 text-xs">
        <div class="flex items-start gap-3 rounded-md border border-ink/20 bg-bg p-3">
          <span class="text-base leading-none">📊</span>
          <div>
            <strong class="block font-bold text-ink text-sm">Arena Live</strong>
            <span class="text-muted">Pantau perolehan poin setiap ronde secara langsung dari mana saja.</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-md border border-ink/20 bg-bg p-3">
          <span class="text-base leading-none">🏆</span>
          <div>
            <strong class="block font-bold text-ink text-sm">Klasemen Sepuh Remi</strong>
            <span class="text-muted">Papan peringkat otomatis berdasarkan akumulasi poin & total kemenangan.</span>
          </div>
        </div>
        <div class="flex items-start gap-3 rounded-md border border-ink/20 bg-bg p-3">
          <span class="text-base leading-none">📱</span>
          <div>
            <strong class="block font-bold text-ink text-sm">Sinkronisasi Realtime</strong>
            <span class="text-muted">Hubungkan aplikasi mobile dengan kode share 6 digit tanpa registrasi.</span>
          </div>
        </div>
      </div>
    </div>

    <footer class="mt-8 text-center text-xs font-medium text-faint">
      Created by Tukang Kopek
    </footer>
  </Layout>
);

export default IndexPage;
