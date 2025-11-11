import type { Metadata } from "next";
import { inter, crimsonPro } from "@/lib/fonts";
import "./globals.css";
import TanStackProvider from "@/components/providers/TanStackProvider";
import {
  tablereadJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/components/seo/TablereadSchema";
import Script from "next/script";

const siteUrl = new URL("https://www.tablereadnow.com");

export const metadata: Metadata = {
  title: {
    default: "tableread – AI Scene Reader & Audition Tracker for Actors",
    template: "%s | tableread",
  },
  description:
    "tableread is an AI-powered scene-reader and audition tracker for actors. Rehearse scripts with your own personal scene partner, fine-tune delivery of each line, track auditions, and perform with confidence.",
  metadataBase: siteUrl,
  keywords: [
    "acting audition tracker",
    "scene reader AI",
    "actors rehearsal tool",
    "fine tune line delivery",
    "AI scene partner",
    "audition management software",
  ],
  openGraph: {
    title: "tableread – AI Scene Reader & Audition Tracker for Actors",
    description:
      "Rehearse scripts with an AI scene partner, fine-tune your delivery, track auditions and organize scenes — designed for professional actors.",
    url: siteUrl.toString(),
    siteName: "tableread",
    images: [
      {
        url: `${siteUrl}/logo.svg`,
        width: 1200,
        height: 630,
        alt: "tableread screenshot – AI scene reader tool",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "tableread – AI Scene Reader & Audition Tracker",
    description:
      "Rehearse scenes with your AI scene partner, track auditions and fine-tune your acting delivery. Built for actors by actors.",
    images: [`${siteUrl}/og-image.png`],
    site: "@tablereadapp",
    creator: "@tablereadapp",
  },
  robots: {
    index: true,
    follow: true,
  },
  // icons: {
  //   icon: '/favicon.ico',
  //   apple: '/apple-touch-icon.png',
  // },
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${inter.variable} ${crimsonPro.variable} antialiased`}>
        {/* JSON-LD schemas */}
        <Script
          id="schema-tableread"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(tablereadJsonLd),
          }}
        />
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <Script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />

        <TanStackProvider>{children}</TanStackProvider>
      </body>
    </html>
  );
}
