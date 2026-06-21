import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ weight: ['400', '500', '600', '700', '800'], subsets: ['latin'], variable: '--font-poppins' });

export const metadata: Metadata = {
  metadataBase: new URL('https://sudhirtutorials.me'),
  title: "SUDHIR TUTORIALS - AI Powered Learning Platform",
  description:
    "SUDHIR TUTORIALS is a premium AI-powered learning platform that combines expert educational content with Guru AI, a 24/7 academic assistant that provides instant doubt solving, personalized guidance, and continuous learning support. Our mission is to give every student a personal AI learning companion that makes quality education more accessible, engaging, and effective.",
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "SUDHIR TUTORIALS - AI Powered Learning Platform",
    description:
      "SUDHIR TUTORIALS is a premium AI-powered learning platform that combines expert educational content with Guru AI, a 24/7 academic assistant that provides instant doubt solving, personalized guidance, and continuous learning support. Our mission is to give every student a personal AI learning companion that makes quality education more accessible, engaging, and effective.",
    url: "https://sudhirtutorials.me",
    siteName: "SUDHIR TUTORIALS",
    images: [
      {
        url: "/favicon-512.png",
        width: 512,
        height: 512,
        alt: "SUDHIR TUTORIALS Logo",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SUDHIR TUTORIALS - AI Powered Learning Platform",
    description:
      "SUDHIR TUTORIALS is a premium AI-powered learning platform that combines expert educational content with Guru AI, a 24/7 academic assistant that provides instant doubt solving, personalized guidance, and continuous learning support. Our mission is to give every student a personal AI learning companion that makes quality education more accessible, engaging, and effective.",
    images: ["/favicon-512.png"],
  }
};

import { Providers } from '@/components/Providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SUDHIR TUTORIALS",
    "alternateName": ["Sudhir Tutorials", "ST"],
    "url": "https://sudhirtutorials.me"
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })()
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

