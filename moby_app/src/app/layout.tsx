import type { Metadata } from "next";
import { inter, crimsonPro, comfortaa, outfit } from "@/lib/fonts";
import "./globals.css";
import TanStackProvider from "@/components/providers/TanStackProvider";
import {
  odeeJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/components/seo/OdeeRootSchema";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://odee.io"),
  title: {
    template: "%s — Odee",
    default: "Odee",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.className} ${inter.variable} ${crimsonPro.variable} ${comfortaa.variable} ${outfit.variable} antialiased`}
      >
        {/* JSON-LD schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(odeeJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />

        <TanStackProvider>{children}</TanStackProvider>
        <Analytics />
      </body>
    </html>
  );
}
