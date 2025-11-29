export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  content: string; // Markdown content
  author: string;
  date: string;
  tags: string[];
  readTime: string;
  coverImage?: string;
}

export enum PageView {
  HOME,
  POST_DETAIL,
}