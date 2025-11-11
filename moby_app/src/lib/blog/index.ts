// lib/blog.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { isValidCategory } from "./categories";

const postsDirectory = path.join(process.cwd(), "content/blog");

export interface BlogPostMetadata {
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  featured: boolean;
  image: string;
}

export interface BlogPost extends BlogPostMetadata {
  slug: string;
  contentHtml: string;
}

export interface BlogPostPreview extends BlogPostMetadata {
  slug: string;
}

export async function getBlogPost(slug: string): Promise<BlogPost> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  // Validate category
  if (!isValidCategory(data.category)) {
    console.warn(
      `Warning: Invalid category "${data.category}" in post "${slug}". Using "acting-techniques" as fallback.`
    );
    data.category = "acting-techniques";
  }

  const contentHtml = await marked(content);

  return {
    slug,
    contentHtml,
    ...(data as BlogPostMetadata),
  };
}

export function getAllBlogPosts(): BlogPostPreview[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      // Validate category
      if (!isValidCategory(data.category)) {
        console.warn(
          `Warning: Invalid category "${data.category}" in post "${slug}". Using "acting-techniques" as fallback.`
        );
        data.category = "acting-techniques";
      }

      return {
        slug,
        ...(data as BlogPostMetadata),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return allPostsData;
}

// Get posts by category
export function getPostsByCategory(category: string): BlogPostPreview[] {
  const allPosts = getAllBlogPosts();
  return allPosts.filter((post) => post.category === category);
}

// Get all unique categories that have posts
export function getCategoriesWithPosts(): string[] {
  const allPosts = getAllBlogPosts();
  const categories = new Set(allPosts.map((post) => post.category));
  return Array.from(categories);
}
