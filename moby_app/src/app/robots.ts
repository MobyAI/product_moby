import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/beta-control",
          "/voice-samples",
          "/login",
          "/signup",
          "/onboarding",
          "/access-code",
          "/practice-room",
          "/profile",
          "/scrits",
          "/scripts/",
          "/tracker",
          "/dashboard",
          "/settings",
        ],
      },
    ],
    sitemap: "https://www.tablereadnow.com/sitemap.xml",
    host: "https://www.tablereadnow.com",
  };
}
