export const tablereadJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "tableread",
  alternateName: "tableread – AI Scene Partner for Actors",
  url: "https://www.tablereadnow.com",
  image: "https://www.tablereadnow.com/logo.svg",
  // screenshot: "https://tablereadnow.com/screenshot.png",
  operatingSystem: "Web",
  applicationCategory: "MultimediaApplication",
  description:
    "tableread is an AI-powered rehearsal and audition management platform for actors. Upload scripts, rehearse lines with lifelike AI voices, and track your auditions all in one place.",
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
    description: "Free trial available",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSe9THykmDJkTY1C2E7sdofD58M3UGKhKHKQQ_gUsoyPBM1jsQ/viewform",
    availability: "https://schema.org/InStock",
  },
  author: {
    "@type": "Organization",
    name: "tableread",
    url: "https://www.tablereadnow.com",
  },
  publisher: {
    "@type": "Organization",
    "@id": "https://www.tablereadnow.com#organization",
    name: "tableread",
    logo: {
      "@type": "ImageObject",
      url: "https://www.tablereadnow.com/logo.svg",
    },
  },
  features: [
    "AI-powered scene partner",
    "Script upload and parsing",
    "Audition tracking",
    "Line delivery practice",
    "Progress monitoring",
  ],
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.tablereadnow.com#organization",
  name: "tableread",
  url: "https://www.tablereadnow.com",
  logo: {
    "@type": "ImageObject",
    url: "https://www.tablereadnow.com/logo.svg",
    width: 512,
    height: 512,
  },
  // image: "https://tablereadnow.com/og-image.png",
  // sameAs: [
  //   "https://www.instagram.com/tablereadapp",
  //   "https://twitter.com/tablereadapp",
  //   "https://www.linkedin.com/company/tablereadapp/",
  // ],
  description:
    "tableread is an AI-powered rehearsal and audition management platform for actors. Upload scripts, rehearse lines, and manage auditions all in one place.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "try.tableread@gmail.com",
  },
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.tablereadnow.com#website",
  url: "https://www.tablereadnow.com",
  name: "tableread",
  description:
    "AI-powered rehearsal and audition management platform for actors",
  publisher: {
    "@id": "https://www.tablereadnow.com#organization",
  },
  inLanguage: "en-US",
  // potentialAction: {
  //   "@type": "SearchAction",
  //   target: {
  //     "@type": "EntryPoint",
  //     urlTemplate: "https://www.tablereadnow.com/search?q={search_term_string}",
  //   },
  //   "query-input": "required name=search_term_string",
  // },
};
