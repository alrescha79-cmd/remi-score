/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { FC, PropsWithChildren } from 'hono/jsx';

interface LayoutProps {
  title: string;
  description?: string;
  liveCode?: string;
  syncedAt?: string;
}

const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, description, liveCode, syncedAt, children }) => (
  <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title} — RemiScore</title>
      {description && <meta name="description" content={description} />}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&display=swap" rel="stylesheet" />
      <script src="https://cdn.tailwindcss.com"></script>
      <script dangerouslySetInnerHTML={{
        __html: `tailwind.config={theme:{extend:{
          fontFamily:{
            display:['"Cabinet Grotesk"', 'Inter', 'sans-serif'],
            sans:['"Inter"', 'sans-serif']
          },
          colors:{
            primary:'#3b82f6',
            secondary:'#a855f7',
            bg:'#f8fafc',
            surface:'#ffffff',
            ink:'#1e293b',
            muted:'#64748b',
            faint:'#94a3b8',
            good:'#22c55e',
            bad:'#ef4444',
            line:'#1e293b'
          },
          boxShadow:{
            brutal:'4px 4px 0px 0px #1e293b',
            'brutal-lg':'6px 6px 0px 0px #1e293b',
            'brutal-sm':'2px 2px 0px 0px #1e293b'
          }
        }}}`
      }} />
      <style dangerouslySetInnerHTML={{
        __html: `
          body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; }
          h1, h2, h3, .font-display { font-family: 'Cabinet Grotesk', sans-serif; }
        `
      }} />
    </head>
    <body class="min-h-screen bg-bg text-ink selection:bg-primary/20 selection:text-primary">
      <div class="mx-auto max-w-lg px-4 py-6">
        {children}
      </div>
      {liveCode && (
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var code = ${JSON.stringify(liveCode)};
              var current = ${JSON.stringify(syncedAt ?? '')};
              var timer = null;
              function check() {
                if (document.hidden) return;
                fetch('/api/circle/version?code=' + encodeURIComponent(code))
                  .then(function(r) { return r.json(); })
                  .then(function(d) {
                    if (d && d.ok && d.syncedAt && d.syncedAt !== current) {
                      window.location.reload();
                    }
                  })
                  .catch(function() {});
              }
              function start() {
                if (timer) clearInterval(timer);
                timer = setInterval(check, 2500);
              }
              document.addEventListener('visibilitychange', function() {
                if (!document.hidden) { check(); start(); }
              });
              start();
            })();
          `
        }} />
      )}
    </body>
  </html>
);

export default Layout;
