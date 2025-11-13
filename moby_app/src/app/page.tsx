import type { Metadata } from "next";
import LandingPage from "@/components/landingPage/LandingPage";

const siteUrl = new URL("https://www.odee.io");

export const metadata: Metadata = {
  title: "odee – AI-Powered Scene Reader & Audition Tracker for Actors",
  description:
    "Odee is an AI-powered scene-reader and audition tracker for actors. Rehearse scripts with your own personal scene partner, fine-tune delivery of each line, track auditions, and perform with confidence.",
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
    title: "odee – AI-Powered Scene Reader & Audition Tracker for Actors",
    description:
      "Rehearse scripts with your own personal scene partner, fine-tune your delivery, track auditions and organize scenes — designed for actors by actors.",
    url: siteUrl.toString(),
    siteName: "odee",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "odee – AI-Powered Scene Reader & Audition Tracker",
    description:
      "Rehearse scripts with your own personal scene partner, fine-tune your delivery, track auditions and organize scenes — designed for actors by actors.",
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
