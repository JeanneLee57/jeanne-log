import { getAboutContent } from '../../services/postService';
import { PostDetail } from '../../components/PostDetail';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const aboutContent = await getAboutContent();

  if (!aboutContent) {
    return {
      title: 'About Me Not Found',
    };
  }

  return {
    title: `${aboutContent.title} | jeanne-log`,
    description: aboutContent.summary,
    openGraph: {
      title: aboutContent.title,
      description: aboutContent.summary,
      type: 'profile'
    },
  };
}

export default async function AboutPage() {
  const aboutContent = await getAboutContent();

  if (!aboutContent) {
    notFound();
  }

  return <PostDetail post={aboutContent} />;
}