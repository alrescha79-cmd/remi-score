/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { FC } from 'hono/jsx';
import Layout from './layout';

const NotFound: FC = () => (
  <Layout title="Tongkrongan Tidak Ditemukan">
    <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div class="rounded-2xl border-2 border-ink bg-surface p-8 shadow-brutal max-w-sm w-full">
        <p class="text-7xl font-extrabold font-display text-primary tracking-tight">404</p>
        <h1 class="mt-3 text-xl font-extrabold font-display text-ink">Tongkrongan Tidak Ditemukan</h1>
        <p class="mt-2 text-xs text-muted leading-relaxed">
          Kode tongkrongan tidak ditemukan atau belum pernah disinkronkan dari aplikasi mobile.
        </p>
        <a
          href="/"
          class="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-md border-2 border-ink bg-primary px-4 py-2.5 text-xs font-extrabold text-white shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          ← Kembali ke Halaman Utama
        </a>
      </div>
    </div>
  </Layout>
);

export default NotFound;
