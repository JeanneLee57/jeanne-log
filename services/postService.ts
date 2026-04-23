import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  getPublishedPostBySlugFromDatabase,
  getPublishedPostsFromDatabase,
} from '@/services/articleRepository';
import { BlogPost, AboutData } from '../types';

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
  return getPublishedPostsFromDatabase();
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return getPublishedPostBySlugFromDatabase(slug);
}
