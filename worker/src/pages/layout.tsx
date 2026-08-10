import type { FC, PropsWithChildren } from 'hono/jsx';

interface LayoutProps {
  title: string;
  description?: string;
}

const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title, description, children }) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title} — RemiScore</title>
      {description && <meta name="description" content={description} />}
      <script src="https://cdn.tailwindcss.com"></script>
      <script dangerouslySetInnerHTML={{
        __html: `tailwind.config={theme:{extend:{colors:{
          accent:{DEFAULT:'#0071e3',soft:'#e7f0fd',deep:'#0056b3'},
          good:'#0a5d2e',bad:'#c62828',
          surface:{DEFAULT:'#f2f4f9',alt:'#fbfcfe',fill:'#e8ebf2'},
          ink:{DEFAULT:'#1b1f27',muted:'#5d6471',faint:'#5f6673'},
          medalGold:'#a0740c',medalSilver:'#787f8c',medalBronze:'#b0713f'
        }}}}`
      }} />
      <style dangerouslySetInnerHTML={{
        __html: `
          @media(prefers-color-scheme:dark){
            :root{--bg:#0d1117;--bg-alt:#161b22;--bg-fill:#21262d;--ink:#f5f7fc;--ink-muted:#9da8b8;--ink-faint:#788496;--accent:#0a84ff;--accent-soft:#162842;--good:#30d158;--bad:#ff453a}
            body{background:var(--bg);color:var(--ink)}
          }
          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
        `
      }} />
    </head>
    <body class="min-h-screen bg-surface text-ink dark:bg-[#0d1117] dark:text-[#f5f7fc]">
      <div class="mx-auto max-w-lg px-4 py-6">
        {children}
      </div>
    </body>
  </html>
);

export default Layout;
