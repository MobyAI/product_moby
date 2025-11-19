// lib/extractTOC.ts
interface TocItem {
  id: string;
  title: string;
  level: number;
}

export function extractTableOfContents(content: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();

    // Generate ID the same way the component does
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    items.push({ id, title, level });
  }

  return items;
}
