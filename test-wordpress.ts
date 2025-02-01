import 'dotenv/config';
import { getPosts } from './src/lib/wordpress';

async function testWordPressAPI() {
  console.log('Starting WordPress API Test');
  try {
    const posts = await getPosts();
    console.log('Retrieved Posts:', posts.length);
    posts.forEach((post, index) => {
      console.log(`Post ${index + 1}:`, {
        id: post.id,
        title: post.title.rendered,
        slug: post.slug
      });
    });
  } catch (error) {
    console.error('Error retrieving posts:', error);
  }
}

testWordPressAPI();
