import { getAllPosts } from '../services/postService';
import { PostList } from '../components/PostList';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 8;

interface HomeProps {
  searchParams?: Promise<{ page?: string | string[] }>;
}

function normalizePage(value: string | string[] | undefined, totalPages: number) {
  const rawPage = Array.isArray(value) ? value[0] : value;
  const parsedPage = Number.parseInt(rawPage ?? '1', 10);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return Math.min(parsedPage, totalPages);
}

export default async function Home({ searchParams }: HomeProps) {
  const [posts, params] = await Promise.all([getAllPosts(), searchParams]);
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const currentPage = normalizePage(params?.page, totalPages);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <PostList
      posts={paginatedPosts}
      currentPage={currentPage}
      totalPages={totalPages}
      totalPosts={posts.length}
    />
  );
}
