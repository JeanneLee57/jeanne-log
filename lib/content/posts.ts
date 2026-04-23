import matter from "gray-matter";
import type { LineIndexEntry } from "@/db/schema";

type ParsedPostMetadata = {
  title: string;
  summary: string;
  author: string;
  date: string;
  tags: string[];
  readTime?: string;
};

export function parsePostFile(fileContents: string): {
  metadata: ParsedPostMetadata;
  body: string;
} {
  const { data, content } = matter(fileContents);

  return {
    metadata: {
      title: typeof data.title === "string" ? data.title : "",
      summary: typeof data.summary === "string" ? data.summary : "",
      author: typeof data.author === "string" ? data.author : "Admin",
      date:
        typeof data.date === "string"
          ? data.date
          : new Date().toISOString().split("T")[0],
      tags: Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === "string")
        : ["General"],
      readTime: typeof data.readTime === "string" ? data.readTime : undefined,
    },
    body: content.trim(),
  };
}

export function calculateReadTime(text: string): string {
  const wpm = 200;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const time = Math.max(1, Math.ceil(words / wpm));
  return `${time} min read`;
}

export function buildLineIndex(source: string): LineIndexEntry[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const entries: LineIndexEntry[] = [];
  let cursor = 0;

  lines.forEach((line, index) => {
    const startOffset = cursor;
    const endOffset = cursor + line.length;

    entries.push({
      lineNumber: index + 1,
      startOffset,
      endOffset,
      content: line,
    });

    cursor = endOffset + 1;
  });

  return entries;
}

export function createPlainTextSnapshot(source: string) {
  return source.replace(/\r\n/g, "\n").trim();
}
