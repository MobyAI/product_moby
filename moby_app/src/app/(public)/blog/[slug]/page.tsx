import { getBlogPost, getAllBlogPosts } from "@/lib/blog";
import { extractTableOfContents } from "@/lib/blog/extractTOC";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import BlogPostClient from "./BlogPostClient";

const baseUrl = "https://odee.io";

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      images: [`${baseUrl}${post.image}`],
      url: `${baseUrl}/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [`${baseUrl}${post.image}`],
      site: "@odee_io",
    },
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  const tocItems = extractTableOfContents(post.content);

  // Article Schema for SEO
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: `${baseUrl}${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "odee",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${slug}`,
    },
  };

  // Breadcrumb Schema for SEO
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
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${baseUrl}/blog/${slug}`,
      },
    ],
  };

  // Helper function to generate slug from text
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Custom heading components
  const components = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ children, ...props }: any) => {
      const id = generateSlug(children?.toString() || "");
      return (
        <h2 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h2>
      );
    },
  };

  return (
    <>
      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogPostClient
        post={{
          title: post.title,
          description: post.description,
          image: post.image,
          date: post.date,
          author: post.author,
          slug: post.slug,
        }}
        tocItems={tocItems}
      >
        <div className="blog-content max-w-2xl mx-auto">
          <MDXRemote source={post.content} components={components} />
        </div>
      </BlogPostClient>
    </>
  );
}
