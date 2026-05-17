import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "S³ — Sportrail Scouting System",
  description: "S³ Sportrail Scouting System — ferramenta profissional de scouting de futebol. Relatórios estruturados, campograma interactivo, exportação PDF e partilha rápida. Por Sportrail.",
  metadataBase: new URL("https://scouting.sportrail.pt"),
  applicationName: "S³ Sportrail Scouting",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "S³ Scouting",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "S³ — Sportrail Scouting System",
    description: "Ferramenta profissional de scouting de futebol. By Sportrail.",
    url: "https://scouting.sportrail.pt",
    siteName: "S³ Sportrail Scouting System",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "S³ Sportrail Scouting System",
      },
    ],
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S³ — Sportrail Scouting System",
    description: "Ferramenta profissional de scouting de futebol.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0B0D1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-PT">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="S³ Scouting" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap"
        />

        <style>{`
          :root {
            --font-display: "DM Serif Display", "Times New Roman", serif;
            --font-body: "Bricolage Grotesque", system-ui, -apple-system, sans-serif;
            --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
          }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #0B0D1A;
            color: #E8EAF2;
            font-family: var(--font-body);
            letter-spacing: -0.005em;
            line-height: 1.65;
            font-feature-settings: "liga" 1, "clig" 1;
            -webkit-font-smoothing: antialiased;
            -webkit-tap-highlight-color: transparent;
            overscroll-behavior-y: none;
          }

          /* Glow dourado ambiente + grão subtil */
          body::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background:
              radial-gradient(60% 50% at 50% 0%, rgba(221, 184, 92, 0.10) 0%, rgba(221, 184, 92, 0.04) 35%, transparent 70%),
              radial-gradient(40% 40% at 85% 15%, rgba(221, 184, 92, 0.05) 0%, transparent 60%);
          }
          body::after {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            opacity: 0.025;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .s3-shell, .s3-mobile-topbar, .s3-sidebar-overlay { position: relative; z-index: 1; }

          h1, h2, h3 {
            font-family: var(--font-display);
            letter-spacing: 0;
            line-height: 1.2;
          }
          code, pre, .s3-mono { font-family: var(--font-mono); }

          input, select, textarea {
            font-size: 16px;
          }

          .s3-shell {
            display: flex;
            min-height: 100vh;
          }

          .s3-sidebar {
            width: 280px;
            flex-shrink: 0;
            border-right: 1px solid #2A2E48;
            background: #0B0D1A;
          }

          .s3-main-area {
            flex: 1;
            min-width: 0;
          }

          .s3-mobile-topbar { display: none; }
          .s3-sidebar-overlay { display: none; }

          @media (max-width: 768px) {
            .s3-shell {
              display: block;
              min-height: 100vh;
              min-height: 100dvh;
            }

            .s3-sidebar {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              width: 86%;
              max-width: 340px;
              z-index: 1000;
              transform: translateX(-100%);
              transition: transform 0.25s ease-out;
              box-shadow: 4px 0 24px rgba(0,0,0,0.6);
              overflow-y: auto;
              -webkit-overflow-scrolling: touch;
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
            }
            .s3-sidebar.s3-sidebar-open {
              transform: translateX(0);
            }

            .s3-sidebar-overlay {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.55);
              z-index: 999;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.2s;
            }
            .s3-sidebar-overlay.s3-sidebar-open {
              opacity: 1;
              pointer-events: auto;
            }

            .s3-mobile-topbar {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: calc(12px + env(safe-area-inset-top)) 14px 12px 14px;
              background: rgba(11,13,26,0.96);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              border-bottom: 1px solid #2A2E48;
              position: sticky;
              top: 0;
              z-index: 50;
            }
            .s3-hamburger {
              background: transparent;
              border: 1px solid #2A2E48;
              color: #E8EAF2;
              width: 42px;
              height: 42px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              flex-shrink: 0;
              padding: 0;
            }
            .s3-mobile-title {
              flex: 1;
              font-size: 14px;
              font-weight: 700;
              color: #fff;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .s3-mobile-brand {
              font-size: 11px;
              font-weight: 900;
              color: #DDB85C;
              letter-spacing: 1.5px;
            }

            .s3-main-area { width: 100%; }

            main#report {
              padding: 16px 14px calc(80px + env(safe-area-inset-bottom)) 14px !important;
              max-width: 100% !important;
            }
            main#compare {
              padding: 16px 14px calc(80px + env(safe-area-inset-bottom)) 14px !important;
              max-width: 100% !important;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }

            main#report [style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }

            h2 { font-size: 15px !important; }

            main#report input[type="text"],
            main#report input[type="number"],
            main#report input[type="date"],
            main#report input[type="email"],
            main#report select,
            main#report textarea {
              min-height: 44px;
              font-size: 16px !important;
              width: 100% !important;
            }

            button {
              min-height: 40px;
            }

            /* Header of the app: allow wrap */
            header > div:first-child {
              flex-wrap: wrap !important;
              gap: 8px !important;
            }
          }

          @media (max-width: 420px) {
            h2 { font-size: 14px !important; }
            main#report { padding: 12px 10px 90px 10px !important; }
          }

          @media print {
            .no-print, .s3-sidebar, .s3-mobile-topbar, .s3-sidebar-overlay { display: none !important; }
            .s3-main-area { width: 100% !important; }
            body { background: #fff !important; color: #000 !important; }
          }

          @media (display-mode: standalone) {
            body { overscroll-behavior: none; }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0B0D1A" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
