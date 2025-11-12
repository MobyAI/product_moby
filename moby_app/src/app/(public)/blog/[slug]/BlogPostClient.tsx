"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BlogPostProps {
  post: {
    title: string;
    description: string;
    image: string;
    date: string;
    author: string;
    contentHtml: string;
    slug: string;
  };
}

export default function BlogPostClient({ post }: BlogPostProps) {
  const [scrollOpacity, setScrollOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate opacity based on scroll position
      // Fade out completely by 150px of scrolling (faster/more sensitive)
      const scrolled = window.scrollY;
      const fadeDistance = 350;
      const opacity = Math.max(0, 1 - scrolled / fadeDistance);
      setScrollOpacity(opacity);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            image: `https://www.tablereadnow.com${post.image}`,
            datePublished: post.date,
            author: {
              "@type": "Person",
              name: post.author,
            },
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

      <div className="relative bg-primary-light min-h-screen">
        {/* Sticky Title Section - Behind content, fades on scroll */}
        <div
          className="sticky top-25 z-0"
          style={{ opacity: scrollOpacity }}
        >
          <header>
            <div className="max-w-6xl mx-auto px-5 mb-30">
              <h1 className="text-5xl lg:text-8xl font-[300] font-crimson text-black">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-lg text-gray-600 font-crimson mt-14">
                <span>Written by</span>
                <span className="font-bold">{post.author}</span>
                <span>|</span>
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
            </div>
          </header>
        </div>

        {/* Content with Image - Scrolls over the sticky title section */}
        <article className="relative z-10">
          {/* Gradient overlay to fade in the background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-light/80 to-primary-light pointer-events-none" />

          {/* Content */}
          <div className="relative">
            {/* Landscape Image & Description Container */}
            <div className="max-w-6xl mx-auto mb-15 px-5">
              <div className="relative h-[300px] lg:h-[500px] mb-2">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover rounded-2xl"
                  priority
                  sizes="100vw"
                />
              </div>

              {/* Description */}
              <p className="text-md lg:text-lg text-gray-700 font-crimson font-medium">
                {post.description}
              </p>
            </div>

            {/* Article Content */}
            <div className="px-5 lg:px-20 pb-20">
              <div className="max-w-2xl mx-auto">
                <div
                  className="prose lg:prose-xl prose-headings:font-crimson prose-headings:font-semibold prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-black max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
