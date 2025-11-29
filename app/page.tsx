import { getAllPosts } from '../services/postService';
import { PostList } from '../components/PostList';

export const revalidate = 3600;

export default async function Home() {
  const posts = await getAllPosts();

  return (
    <main>
      <PostList posts={posts} />
    </main>
  );
}