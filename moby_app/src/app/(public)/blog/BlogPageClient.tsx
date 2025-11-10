"use client";

import { useState } from "react";
import { type BlogPostPreview } from "@/lib/blog";
import { BLOG_CATEGORIES, getCategoryById } from "@/lib/blog/categories";
import Image from "next/image";
import Link from "next/link";

export default function BlogPageClient({
  initialPosts,
}: {
  initialPosts: BlogPostPreview[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter posts based on selected category
  const filteredPosts = selectedCategory
    ? initialPosts.filter((post) => post.category === selectedCategory)
    : initialPosts;

  const featuredPosts = filteredPosts.filter((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  // Count posts per category
  const categoryCounts = BLOG_CATEGORIES.map((category) => ({
    ...category,
    count: initialPosts.filter((post) => post.category === category.id).length,
  }));

  return (
    <div className="min-h-screen bg-primary-light">
      {/* Header */}
      <header>
        <div className="max-w-6xl mx-auto px-5 pb-5 pt-25">
          <h1 className="text-6xl font-[300] font-crimson text-black mb-2">
            Tableread Blog: Expert Articles on Acting
          </h1>
          <p className="text-md text-gray-600 max-w-3xl">
            Expert tips, techniques, and strategies to help you excel in
            auditions, master your craft, and advance your acting career.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-4">
        {/* Category Filters */}
        <section className="mb-5">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {/* All Categories Button */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              All Articles ({initialPosts.length})
            </button>

            {/* Category Filter Buttons */}
            {categoryCounts.map(
              (category) =>
                category.count > 0 && (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? "bg-black text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category.label} ({category.count})
                  </button>
                )
            )}
          </div>
        </section>

        {/* Featured Posts Section - Horizontal Carousel */}
        {featuredPosts.length > 0 && (
          <section className="mb-5">
            <div className="flex gap-2 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {featuredPosts.map((post) => (
                <FeaturedPostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Regular Posts Section - Vertical Stack of Horizontal Cards */}
        {regularPosts.length > 0 && (
          <section>
            <div className="space-y-8">
              {regularPosts.map((post) => (
                <RegularPostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">
              No articles found in this category.
            </p>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View all articles →
            </button>
          </div>
        )}

        {/* No posts at all */}
        {initialPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No blog posts yet. Check back soon!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Featured Post Card - Horizontal Card with Large Image
function FeaturedPostCard({ post }: { post: BlogPostPreview }) {
  const category = getCategoryById(post.category);

  return (
    <article className="flex-shrink-0 w-[400px] snap-start">
      <Link href={`/blog/${post.slug}`} className="block group">
        {/* Image Container - Taller portrait mode */}
        <div className="relative h-[550px] w-full rounded-lg overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="400px"
          />

          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Category Badge - Top Left */}
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {category?.label || post.category}
            </span>
          </div>

          {/* Date Badge - Top Right */}
          <div className="absolute top-4 right-4">
            <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm">
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Title - Bottom of image with gradient background */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="relative group/title">
              <h3 className="text-xl font-semibold text-white line-clamp-2">
                {post.title}
              </h3>

              {/* Custom Tooltip */}
              <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 pointer-events-none group-hover/title:opacity-100 group-hover/title:pointer-events-auto w-max max-w-xs z-10">
                {post.title}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

// Regular Post Card - Horizontal Layout with Image on Right
function RegularPostCard({ post }: { post: BlogPostPreview }) {
  const category = getCategoryById(post.category);

  return (
    <article className="group bg-[#e1ddcf] rounded-lg transition-colors overflow-hidden">
      <Link
        href={`/blog/${post.slug}`}
        className="flex flex-col md:flex-row md:items-stretch"
      >
        {/* Left Side - Content */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          {/* Top Row - Category Badge and Date */}
          <div className="flex items-start justify-between mb-auto">
            {/* Category Badge */}
            <span className="inline-flex items-center gap-1 text-gray-600 text-sm">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              {category?.label || post.category}
            </span>

            {/* Date - Top Right */}
            <time dateTime={post.date} className="text-sm text-gray-500">
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>

          {/* Bottom - Title and Description */}
          <div className="mt-10">
            {/* Title */}
            <h3 className="text-xl font-semibold text-black mb-3 line-clamp-2">
              {post.title}
            </h3>

            {/* Description */}
            <p className="text-md text-gray-600 line-clamp-2">{post.description}</p>
          </div>
        </div>

        {/* Right Side - Image (No padding, takes 45% of width) */}
        <div className="relative w-full md:w-[45%] h-64 md:h-auto">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 45vw"
          />
        </div>
      </Link>
    </article>
  );
}
