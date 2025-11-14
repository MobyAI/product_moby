export const odeeJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "odee",
  alternateName:
    "Odee — Audition & Rehearsal Platform Built for Actors",
  url: "https://www.odee.io",
  image: "https://www.odee.io/icon.png",
  // screenshot: "https://odee.io/screenshot.png",
  operatingSystem: "Web",
  applicationCategory: "MultimediaApplication",
  description:
    "AI-powered scene reader and audition tracker. Rehearse scripts with your own personal scene partner, fine-tune delivery of each line, and track auditions all in one place.",
  softwareVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  // aggregateRating: {
  //   "@type": "AggregateRating",
  //   ratingValue: "5.0",
  //   ratingCount: "10",
  // },
  offers: {
    "@type": "Offer",
    price: "0.00",
    priceCurrency: "USD",
    description: "Early access available",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform",
    availability: "https://schema.org/LimitedAvailability",
  },
  author: {
    "@type": "Organization",
    name: "Odee",
    url: "https://www.odee.io",
  },
  publisher: {
    "@type": "Organization",
    "@id": "https://www.odee.io#organization",
    name: "Odee",
    logo: {
      "@type": "ImageObject",
      url: "https://www.odee.io/icon.png",
    },
  },
  featureList: [
    "AI-powered scene partner",
    "Script upload and parsing",
    "Audition tracking",
    "Line delivery practice",
    "Progress monitoring",
    "24/7 AI-powered scene partner available anytime",
    "100+ voice customization options for character matching",
    "Unlimited rehearsal takes without judgment",
  ],
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.odee.io#organization",
  name: "Odee",
  url: "https://www.odee.io",
  logo: {
    "@type": "ImageObject",
    url: "https://www.odee.io/icon.png",
    width: 512,
    height: 512,
  },
  image: "https://odee.io/opengraph-image.png",
  // sameAs: [
  //   "https://www.instagram.com/Odeeapp",
  //   "https://twitter.com/Odeeapp",
  //   "https://www.linkedin.com/company/Odeeapp/",
  // ],
  description:
    "Odee is an AI-powered rehearsal and audition management platform for actors. Upload scripts, rehearse lines, and manage auditions all in one place.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "hello@odee.io",
  },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.odee.io#website",
  url: "https://www.odee.io",
  name: "Odee",
  description:
    "AI-powered rehearsal and audition management platform for actors",
  publisher: {
    "@id": "https://www.odee.io#organization",
  },
  inLanguage: "en-US",
  // potentialAction: {
  //   "@type": "SearchAction",
  //   target: {
  //     "@type": "EntryPoint",
  //     urlTemplate: "https://www.odee.io/search?q={search_term_string}",
  //   },
  //   "query-input": "required name=search_term_string",
  // },
};
