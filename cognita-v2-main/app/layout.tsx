import './globals.css'

export const metadata = {
  title: 'Cognita',
  description: 'Okuma platformu',
  charset: 'utf-8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme') || 'light';
              var isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            } catch(e){}
          })();
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            } catch(e){}
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
