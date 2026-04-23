import { getAllPosts } from '../services/postService';
import { PostList } from '../components/PostList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const posts = await getAllPosts();

  return (
    <main>
      <PostList posts={posts} />
    </main>
  );
}
