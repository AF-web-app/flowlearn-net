import 'dotenv/config';
import { env } from 'process';
import https from 'https';
import fetch, { FetchError, type RequestInit } from 'node-fetch';

// Robust HTTPS agent to handle various SSL scenarios
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false  // Be cautious with this in production
});

// Comprehensive error logging function
function logDetailedError(context: string, error: any) {
  console.error(`[WORDPRESS API ERROR] ${context}`);
  console.error('Error Name:', error.name);
  console.error('Error Message:', error.message);
  
  // Check if it's a fetch error with additional details
  if (error instanceof FetchError) {
    console.error('Fetch Error Code:', error.code);
    console.error('Fetch Error Type:', error.type);
  }
}

// Enhanced authentication header generation
function getAuthHeaders(): Record<string, string> {
  const username = process.env.WP_USERNAME;
  const password = process.env.WP_PASSWORD;
  const appPassword = process.env.WP_APP_PASSWORD;

  console.log('[DIAGNOSTIC] Authentication Attempt:');
  console.log(' - Username provided:', !!username);
  console.log(' - Standard Password provided:', !!password);
  console.log(' - App Password provided:', !!appPassword);

  // Prioritize authentication methods
  if (appPassword && username) {
    try {
      return {
        'Authorization': `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`,
        'User-Agent': 'FlowLearn WordPress Fetcher',
        'Accept': 'application/json'
      };
    } catch (error) {
      logDetailedError('App Password Authentication', error);
      return { 'User-Agent': 'FlowLearn WordPress Fetcher' };
    }
  }

  if (password && username) {
    try {
      return {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'User-Agent': 'FlowLearn WordPress Fetcher',
        'Accept': 'application/json'
      };
    } catch (error) {
      logDetailedError('Standard Password Authentication', error);
      return { 'User-Agent': 'FlowLearn WordPress Fetcher' };
    }
  }

  return { 'User-Agent': 'FlowLearn WordPress Fetcher' };
}

// Helper function to get WordPress URL from various sources
function getWordPressUrl(): string | undefined {
  const sources = [
    process.env.WORDPRESS_URL,
    env.WORDPRESS_URL,
    env['WORDPRESS_URL'],
    'https://wp.flowlearn.se' // Fallback URL
  ];

  for (const source of sources) {
    if (source) {
      console.log(' [DIAGNOSTIC] Using WordPress URL from:', source);
      return source;
    }
  }

  console.error(' [DIAGNOSTIC] No WordPress URL found');
  return undefined;
}

// Add type for WordPress API response
interface WordPressPostResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string, protected?: boolean };
  excerpt: { rendered: string, protected?: boolean };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: { footnotes?: string };
  categories: number[];
  tags: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string;
    }>;
  };
}

export interface Post {
  id: number;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected?: boolean;
  };
  excerpt: {
    rendered: string;
    protected?: boolean;
  };
  date: string;
  slug: string;
  featuredImage?: string;
  categories: number[];
  status?: string;
}

export async function getPosts(page = 1, perPage = 10, categoryId?: number): Promise<Post[]> {
  console.log('[WORDPRESS] Starting getPosts function');
  
  try {
    const wordpressUrl = getWordPressUrl();
    
    if (!wordpressUrl) {
      console.error('[WORDPRESS] No URL provided');
      return [];
    }

    const baseUrl = wordpressUrl.replace(/\/+$/, '');
    const url = new URL(`${baseUrl}/wp-json/wp/v2/posts`);
    
    // Add comprehensive query parameters
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', perPage.toString());
    url.searchParams.append('_embed', 'true');

    if (categoryId) {
      url.searchParams.append('categories', categoryId.toString());
    }

    console.log('[WORDPRESS] Fetch URL:', url.toString());

    try {
      const authHeaders = getAuthHeaders();
      console.log('[WORDPRESS] Request Headers:', JSON.stringify(authHeaders, null, 2));

      const response = await fetch(url.toString(), {
        method: 'GET',
        agent: httpsAgent,
        headers: authHeaders
      } as RequestInit);
      
      console.log('[WORDPRESS] Response Status:', response.status);
      
      // Enhanced response handling
      const responseText = await response.text();
      console.log('[WORDPRESS] Response Length:', responseText.length);
      console.log('[WORDPRESS] First 500 Response Characters:', responseText.slice(0, 500));

      if (!response.ok) {
        console.error('[WORDPRESS] API Request Failed', {
          status: response.status,
          statusText: response.statusText,
          responseText
        });
        return [];
      }
      
      try {
        const posts: WordPressPostResponse[] = JSON.parse(responseText);
        
        console.log('[WORDPRESS] Posts Fetched:', posts.length);
        if (posts.length > 0) {
          console.log('[WORDPRESS] First Post Preview:', JSON.stringify(posts[0], null, 2));
        }

        return posts.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          date: post.date,
          slug: post.slug,
          status: post.status,  
          featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
          categories: post.categories
        }));
      } catch (parseError) {
        logDetailedError('JSON Parsing Error', parseError);
        return [];
      }
    } catch (fetchError) {
      if (fetchError instanceof FetchError) {
        logDetailedError('Fetch Error', fetchError);
      } else {
        console.error('[WORDPRESS] Unexpected Fetch Error:', fetchError);
      }
      return [];
    }
  } catch (error) {
    logDetailedError('Unexpected WordPress Error', error);
    return [];
  }
}

export interface Category {
  id: number;
  name: string;
}

export async function getCategories(): Promise<Category[]> {
  console.log('[DIAGNOSTIC] Starting getCategories function');
  
  try {
    const wordpressUrl = getWordPressUrl();
    if (!wordpressUrl) {
      console.error('[DIAGNOSTIC] WORDPRESS_URL is NOT set in environment variables');
      return [];
    }

    const baseUrl = wordpressUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/wp-json/wp/v2/categories`;
    
    console.log(`[DIAGNOSTIC] Categories URL: ${url}`);

    const authHeaders = getAuthHeaders();
    const response = await fetch(url, {
      agent: httpsAgent,
      headers: authHeaders
    } as RequestInit);
    
    console.log('[DIAGNOSTIC] Categories Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DIAGNOSTIC] Failed to fetch categories. Status: ${response.status}, Response: ${errorText}`);
      return [];
    }
    
    const categoriesResponse = await response.json();
    
    // Ensure the response is an array
    if (!Array.isArray(categoriesResponse)) {
      console.error('[DIAGNOSTIC] Categories response is not an array:', categoriesResponse);
      return [];
    }
    
    // Type guard to ensure categories match the expected type
    const validCategories = categoriesResponse.filter(
      (category: any): category is Category => 
        typeof category.id === 'number' && 
        typeof category.name === 'string'
    );
    
    return validCategories;
  } catch (error) {
    console.error('[DIAGNOSTIC] Error fetching categories:', error);
    return [];
  }
}

// Add a main function to test post retrieval
async function main() {
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

// Only run main if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}