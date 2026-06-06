import { getAllPosts } from '../services/postService';
import { PostList } from '../components/PostList';

export const dynamic = 'force-dynamic';

const POSTS_PER_PAGE = 8;

interface HomeProps {
  searchParams?: Promise<{
    page?: string | string[];
    tag?: string | string[];
    q?: string | string[];
  }>;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | string[] | undefined, totalPages: number) {
  const rawPage = getSingleParam(value);
  const parsedPage = Number.parseInt(rawPage ?? '1', 10);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return Math.min(parsedPage, totalPages);
}

function normalizeSearchQuery(value: string | string[] | undefined) {
  return (getSingleParam(value) ?? '').trim();
}

export default async function Home({ searchParams }: HomeProps) {
  const [posts, params] = await Promise.all([getAllPosts(), searchParams]);
  const activeTag = getSingleParam(params?.tag);
  const searchQuery = normalizeSearchQuery(params?.q);
  const normalizedSearchQuery = searchQuery.toLocaleLowerCase();
  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort((a, b) =>
    a.localeCompare(b)
  );
  const filteredPosts = posts.filter((post) => {
    const matchesTag = activeTag ? post.tags.includes(activeTag) : true;
    const matchesSearch = normalizedSearchQuery
      ? [post.title, post.summary, ...post.tags]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedSearchQuery)
      : true;

    return matchesTag && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const currentPage = normalizePage(params?.page, totalPages);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

  return (
    <PostList
      posts={paginatedPosts}
      currentPage={currentPage}
      totalPages={totalPages}
      totalPosts={filteredPosts.length}
      allTags={allTags}
      activeTag={activeTag}
      searchQuery={searchQuery}
    />
  );
}
