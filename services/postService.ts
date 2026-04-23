import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { parsePostFile, calculateReadTime } from '@/lib/content/posts';
import {
  getPublishedPostBySlugFromDatabase,
  getPublishedPostsFromDatabase,
} from '@/services/articleRepository';
import { BlogPost, AboutData } from '../types';

const contentDirectory = path.join(process.cwd(), 'contents', 'article');
const pagesDirectory = path.join(process.cwd(), 'contents', 'about');

export async function getAboutContent(): Promise<AboutData | null> {
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
  const { data } = matter(fileContents);

  return {
    title: data.title || slug,
    summary: data.summary || '',
    author: data.author || 'Admin',
    date: data.date ? String(data.date) : new Date().toISOString().split('T')[0],
    tags: data.tags || ['General'],
    profileImage: data.profileImage || '',
    introduction: data.introduction || '',
    links: data.links || [],
    experience: data.experience || [],
    skills: data.skills || [],
    education: data.education || [],
    activities: data.activities || [],
  } as AboutData;
}

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    const databasePosts = await getPublishedPostsFromDatabase();
    if (databasePosts.length > 0) {
      return databasePosts;
    }
  } catch (error) {
    console.warn('Failed to load posts from database, falling back to filesystem.', error);
  }

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
      const { metadata, body } = parsePostFile(fileContents);

      return {
        slug,
        title: metadata.title || slug,
        summary: metadata.summary || body.substring(0, 150) + '...',
        content: body,
        author: metadata.author || 'Admin',
        date: metadata.date || new Date().toISOString().split('T')[0],
        tags: metadata.tags || ['General'],
        readTime: metadata.readTime || calculateReadTime(body),
        contentSource: 'filesystem',
      } as BlogPost;
    });

  return allPostsData.sort((a, b) => {
    return a.date < b.date ? 1 : -1;
  });
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const databasePost = await getPublishedPostBySlugFromDatabase(slug);
    if (databasePost) {
      return databasePost;
    }
  } catch (error) {
    console.warn(`Failed to load post ${slug} from database, falling back to filesystem.`, error);
  }

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
  const { metadata, body } = parsePostFile(fileContents);

  return {
    slug,
    title: metadata.title || slug,
    summary: metadata.summary || body.substring(0, 150) + '...',
    content: body,
    author: metadata.author || 'Admin',
    date: metadata.date || new Date().toISOString().split('T')[0],
    tags: metadata.tags || ['General'],
    readTime: metadata.readTime || calculateReadTime(body),
    contentSource: 'filesystem',
  } as BlogPost;
}
