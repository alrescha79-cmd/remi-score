import type { FC } from 'hono/jsx';
import Layout from './layout';

const NotFound: FC = () => (
  <Layout title="Not Found">
    <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p class="text-6xl font-extrabold text-ink-faint dark:text-[#788496]">404</p>
      <p class="mt-2 text-ink-muted dark:text-[#9da8b8]">Circle not found or not synced yet.</p>
    </div>
  </Layout>
);

export default NotFound;
