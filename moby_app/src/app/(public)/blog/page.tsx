import { getAllBlogPosts } from "@/lib/blog";
import { Metadata } from "next";
import BlogPageClient from "./BlogPageClient";

export const metadata: Metadata = {
  title: "Acting Blog - Tips, Techniques & Audition Strategies",
  description:
    "Expert acting tips, audition preparation guides, and rehearsal techniques. Learn from professionals and improve your craft with Odee's comprehensive blog.",
  openGraph: {
    title: "Acting Blog - Tips & Audition Strategies",
    description:
      "Expert acting tips, audition preparation guides, and rehearsal techniques for actors.",
    type: "website",
    url: "https://www.odee.io/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Acting Blog - Tips & Audition Strategies",
    description:
      "Expert acting tips, audition preparation guides, and rehearsal techniques for actors.",
    site: "@odee_io",
  },
  alternates: {
    canonical: "https://www.odee.io/blog",
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();
  const baseUrl = "https://www.odee.io";

  // Blog Schema
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Odee Acting Blog",
    description:
      "Expert acting tips, audition preparation guides, and rehearsal techniques",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Odee",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`,
      },
    ],
  };

  return (
    <>
      {/* Blog Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogPageClient initialPosts={posts} />
    </>
  );
}
