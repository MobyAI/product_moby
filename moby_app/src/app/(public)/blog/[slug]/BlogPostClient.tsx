"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import TableOfContents from "../TableOfContents";

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface BlogPostProps {
  post: {
    title: string;
    description: string;
    image: string;
    date: string;
    author: string;
    slug: string;
  };
  tocItems: TocItem[];
  children: React.ReactNode;
}

export default function BlogPostClient({
  post,
  tocItems,
  children,
}: BlogPostProps) {
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [showToc, setShowToc] = useState(false);
  const [mountToc, setMountToc] = useState(false);

  useEffect(() => {
    const calculateOpacity = () => {
      const scrolled = window.scrollY;
      const fadeDistance = 350;
      const opacity = Math.max(0, 1 - scrolled / fadeDistance);
      setScrollOpacity(opacity);
    };

    const checkTocVisibility = () => {
      const scrolled = window.scrollY;
      const threshold = 700;
      const shouldShow = scrolled > threshold;

      if (shouldShow && !mountToc) {
        // Mount first, then fade in
        setMountToc(true);
        setTimeout(() => setShowToc(true), 10);
      } else if (!shouldShow && mountToc) {
        // Fade out first, then unmount
        setShowToc(false);
        setTimeout(() => setMountToc(false), 500);
      }
    };

    calculateOpacity();
    checkTocVisibility();

    const handleScroll = () => {
      calculateOpacity();
      checkTocVisibility();
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mountToc]);

  return (
    <div className="relative bg-primary-light min-h-screen">
      {/* Sticky Title Section - Behind content, fades on scroll */}
      <div className="sticky top-25 z-0" style={{ opacity: scrollOpacity }}>
        <header>
          <div className="max-w-6xl mx-auto px-5 mb-28">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-[400] text-black">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-lg text-black mt-10 lg:mt-14">
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
            <div className="relative h-[400px] lg:h-[500px] mb-2">
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
            <p className="text-md lg:text-lg text-gray-700 font-medium">
              {post.description}
            </p>
          </div>

          {/* Two Column Layout: TOC + Article Content */}
          <div className="max-w-6xl mx-auto px-5 pb-20">
            <div
              className={`flex gap-8 lg:gap-20 transition-all duration-500 ${
                mountToc ? "justify-between" : "justify-center"
              }`}
            >
              {/* Table of Contents Column */}
              {mountToc && (
                <div
                  className={`hidden lg:block w-64 flex-shrink-0 transition-opacity duration-500 ${
                    showToc ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <TableOfContents items={tocItems} />
                </div>
              )}

              {/* Article Content Column */}
              <div className="flex-1 max-w-2xl">{children}</div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
