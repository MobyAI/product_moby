import { getAllBlogPosts } from "@/lib/blog";
import { Metadata } from "next";
import BlogPageClient from "./BlogPageClient";

export const metadata: Metadata = {
  title: "Acting Blog - Tips, Techniques & Audition Strategies | TableRead",
  description:
    "Expert acting tips, audition preparation guides, and rehearsal techniques. Learn from professional actors and improve your craft with TableRead's comprehensive blog.",
  openGraph: {
    title: "Acting Blog - Tips & Audition Strategies",
    description:
      "Expert acting tips, audition preparation guides, and rehearsal techniques for performers.",
    type: "website",
    url: "https://www.tablereadnow.com/blog",
    images: [
      {
        url: "https://www.tablereadnow.com/og-blog.jpg",
        width: 1200,
        height: 630,
        alt: "TableRead Acting Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acting Blog - Tips & Audition Strategies",
    description:
      "Expert acting tips and audition preparation guides for performers.",
    images: ["https://www.tablereadnow.com/og-blog.jpg"],
  },
  alternates: {
    canonical: "https://www.tablereadnow.com/blog",
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "TableRead Acting Blog",
            description:
              "Expert acting tips, audition preparation guides, and rehearsal techniques",
            url: "https://www.tablereadnow.com/blog",
            publisher: {
              "@type": "Organization",
              name: "TableRead",
              logo: {
                "@type": "ImageObject",
                url: "https://www.tablereadnow.com/logo.png",
              },
            },
          }),
        }}
      />

      <BlogPageClient initialPosts={posts} />
    </>
  );
}
