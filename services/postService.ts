import fs from 'fs';
import path from 'path';
import { BlogPost } from '../types';

const contentDirectory = path.join(process.cwd(), 'contents', 'article');
const pagesDirectory = path.join(process.cwd(), 'contents', 'about');

// Helper to parse YAML Frontmatter
const parseFrontmatter = (content: string) => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const frontmatterBlock = match[1];
  const body = content.replace(frontmatterRegex, '').trim();

  const metadata: any = {};
  frontmatterBlock.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      let value = valueParts.join(':').trim();
      
      // Clean quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'" ) && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key.trim()] = value.slice(1, -1).split(',').map(v => v.trim());
      } else {
        metadata[key.trim()] = value;
      }
    }
  });

  return { metadata, body };
};

const calculateReadTime = (text: string): string => {
  const wpm = 200;
  const words = text.trim().split(/\s+/).length;
  const time = Math.ceil(words / wpm);
  return `${time} min read`;
};

export async function getAboutContent(): Promise<BlogPost | null> {
  const slug = 'about';
  const fullPathMd = path.join(pagesDirectory, `${slug}.md`);
  const fullPathMdx = path.join(pagesDirectory, `${slug}.mdx`);
  
  let fullPath = '';
  if (fs.existsSync(fullPathMd)) {
    fullPath = fullPathMd;
  } else if (fs.existsSync(fullPathMdx)) {
    fullPath = fullPathMdx;
  } else {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { metadata, body } = parseFrontmatter(fileContents);

  return {
    slug,
    title: metadata.title || slug,
    summary: metadata.summary || body.substring(0, 150) + '...',
    content: body,
    author: metadata.author || 'Admin',
    date: metadata.date || new Date().toISOString().split('T')[0],
    tags: metadata.tags || ['General'],
    readTime: metadata.readTime || calculateReadTime(body),
  } as BlogPost;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(contentDirectory)) {
    fs.mkdirSync(contentDirectory, { recursive: true });
    return [];
  }

  const fileNames = fs.readdirSync(contentDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx?$/, '');
      const fullPath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { metadata, body } = parseFrontmatter(fileContents);

      return {
        slug,
        title: metadata.title || slug,
        summary: metadata.summary || body.substring(0, 150) + '...',
        content: body,
        author: metadata.author || 'Admin',
        date: metadata.date || new Date().toISOString().split('T')[0],
        tags: metadata.tags || ['General'],
        readTime: metadata.readTime || calculateReadTime(body),
      } as BlogPost;
    });

  return allPostsData.sort((a, b) => {
    return a.date < b.date ? 1 : -1;
  });
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const fullPathMd = path.join(contentDirectory, `${slug}.md`);
  const fullPathMdx = path.join(contentDirectory, `${slug}.mdx`);
  
  let fullPath = '';
  if (fs.existsSync(fullPathMd)) {
    fullPath = fullPathMd;
  } else if (fs.existsSync(fullPathMdx)) {
    fullPath = fullPathMdx;
  } else {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { metadata, body } = parseFrontmatter(fileContents);

  return {
    slug,
    title: metadata.title || slug,
    summary: metadata.summary || body.substring(0, 150) + '...',
    content: body,
    author: metadata.author || 'Admin',
    date: metadata.date || new Date().toISOString().split('T')[0],
    tags: metadata.tags || ['General'],
    readTime: metadata.readTime || calculateReadTime(body),
  } as BlogPost;
}
