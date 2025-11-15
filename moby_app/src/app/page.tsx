import type { Metadata } from "next";
import LandingPage from "@/components/landingPage/LandingPage";

const siteUrl = new URL("https://odee.io");

export const metadata: Metadata = {
  title: "Odee — Audition & Rehearsal Platform Built for Actors",
  description:
    "AI-powered scene reader and audition tracker. Rehearse scripts with your own personal scene partner, fine-tune delivery of each line, and track auditions all in one place.",
  metadataBase: siteUrl,
  alternates: {
    canonical: "https://odee.io",
  },
  keywords: [
    "acting audition tracker",
    "scene reader AI",
    "actors rehearsal tool",
    "fine tune line delivery",
    "AI scene partner",
    "audition management software",
  ],
  openGraph: {
    title: "Odee — Audition & Rehearsal Platform Built for Actors",
    description:
      "Rehearse scripts with your own personal scene partner, fine-tune your delivery, and track auditions all in one place — designed for actors by actors.",
    url: siteUrl.toString(),
    siteName: "Odee",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Odee — Audition & Rehearsal Platform Built for Actors",
    description:
      "Rehearse scripts with your own personal scene partner, fine-tune your delivery, and track auditions all in one place — designed for actors by actors.",
    site: "@odee_io",
  },
  robots: {
    index: true,
    follow: true,
  },
  category: "entertainment",
};

export default function Home() {
  return <LandingPage />;
}
