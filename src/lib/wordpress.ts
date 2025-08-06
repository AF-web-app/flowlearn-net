import 'dotenv/config';
import * as dotenv from 'dotenv';
import https from 'https';
import fetch, { FetchError } from 'node-fetch';
import { marked } from 'marked';
import { DEBUG, getWordPressUrl as getConfigWordPressUrl, logDetailedError, getEnv } from './config';
import { logWordPressCredentials } from './debug-logger';

// Environment is loaded automatically by config.ts

// Robust HTTPS agent with proper security settings based on environment
const httpsAgent = new https.Agent({
  rejectUnauthorized: getEnv().NODE_ENV === 'production', // Secure in production, allows self-signed in development
  // Add additional security options as needed
  minVersion: 'TLSv1.2' // Ensure minimum TLS version for security
});

// Using centralized error handling from config.ts

// Enhanced authentication header generation
/**
 * Genererar autentiseringsheaders för WordPress API
 * @returns Record<string, string> Headers för API-anrop
 */
function getAuthHeaders(): Record<string, string> {
  // Logga alltid credentials i produktion för felsökning
  console.log('[WORDPRESS_AUTH] Logging credentials for debugging...');
  logWordPressCredentials();
  
  if (DEBUG) console.group('[WORDPRESS_AUTH_DEBUG]');
  const env = getEnv();
  const username = env.WORDPRESS_USERNAME || env.WP_USERNAME;
  const appPassword = env.WORDPRESS_APP_PASSWORD || env.WP_APP_PASSWORD;

  if (DEBUG) {
    console.log('🔐 Authentication Details:', {
      usedUsername: username,
      usernameLength: username?.length,
      passwordProvided: !!appPassword,
      passwordLength: appPassword ? appPassword.length : 0
    });
  }

  if (!username || !appPassword) {
    console.error('❌ Missing WordPress Authentication Credentials');
    if (DEBUG) console.groupEnd();
    throw new Error('WordPress credentials are missing');
  }

  try {
    const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'Flowlearn WordPress Client/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (DEBUG) {
      console.log('✅ Authentication Headers Generated', {
        authHeaderGenerated: true,
        headerLength: headers.Authorization.length
      });
      console.groupEnd();
    }

    return headers;
  } catch (error) {
    console.error('[WORDPRESS_AUTH_GENERATION_ERROR]', error);
    if (DEBUG) console.groupEnd();
    throw error;
  }
}

// Helper function to get WordPress URL from various sources
function getWordPressUrl(): string {
  const envUrl = getConfigWordPressUrl();
  if (!envUrl) {
    console.error('❌ No WordPress URL configured');
    throw new Error('WordPress URL is not configured');
  }

  const mode = import.meta.env.MODE || 'development';
  
  if (DEBUG) {
    console.group('[WORDPRESS_URL_DEBUG]');
    console.log('Environment Details:', {
      envUrl,
      currentMode: mode,
      productionMode: import.meta.env.PROD,
      developmentMode: import.meta.env.DEV,
      nodeEnv: process.env.NODE_ENV
    });
    console.log('✅ Using WordPress URL:', envUrl);
    console.groupEnd();
  }
  return envUrl;
}

// Interface for a single term (category or tag) from WP API _embedded
interface WPTerm {
  id: number;
  link: string;
  name: string;
  slug: string;
  taxonomy: 'category' | 'post_tag' | string; // Be more specific if needed
}

// Interface for media details within WP API _embedded
interface WPMediaDetails {
  width: number;
  height: number;
  file: string;
  sizes: { 
    [key: string]: { // e.g., thumbnail, medium, large
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }
  };
  image_meta: object; // Define further if needed
}

// Interface for the featured media object within WP API _embedded
interface WPMedia {
  id: number;
  date: string;
  slug: string;
  type: string;
  link: string;
  title: { rendered: string };
  author: number;
  caption: { rendered: string };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details?: WPMediaDetails; // Use the detailed interface
  source_url: string;
}

// Add type for WordPress API response
export interface WordPressPostResponse {
  id: number;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  slug: string;
  categories: number[];
  featured_media?: number;
  tags?: number[];
  status?: string;
  _embedded?: {
    'wp:featuredmedia'?: WPMedia[];
    'wp:term'?: WPTerm[][];
  }
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
  categories: { 
    id: number; 
    name: string; 
    slug: string; 
  }[];
  tags?: { 
    id: number; 
    name: string; 
    slug: string; 
  }[];
  status?: string;
  _embedded?: {
    'wp:term'?: Array<Array<WPTerm>>;
  };
}

interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

// Export this function so it can be imported elsewhere
export async function getCategories(): Promise<WordPressCategory[]> {
  try {
    const wpUrl = getWordPressUrl();
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/categories`, {
      headers: getAuthHeaders(),
      agent: httpsAgent
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const categories: WordPressCategory[] = await response.json() as WordPressCategory[];
    console.log('📑 Available Categories:', categories.map((c: WordPressCategory) => ({ name: c.name, id: c.id })));
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getMediaUrl(mediaId: number): Promise<string | undefined> {
  if (!mediaId) return undefined;
  
  const wpUrl = getWordPressUrl();
  const url = `${wpUrl}/wp-json/wp/v2/media/${mediaId}`;
  
  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
      agent: httpsAgent
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch media ${mediaId}: ${response.statusText}`);
    }
    const media: WPMedia = await response.json() as WPMedia;
    return media.media_details?.sizes?.large?.source_url || media.source_url;
  } catch (error) {
    logDetailedError(`Error fetching media URL for ID ${mediaId}`, error);
    return undefined;
  }
}

/**
 * Fetches posts from the WordPress REST API, handling pagination to retrieve all posts.
 * @param categoryId Optional category ID to filter posts by.
 * @returns A promise that resolves to an array of Post objects.
 */
// Updated getPosts function to handle pagination
export async function getPosts(categoryId?: number): Promise<Post[]> {
  const wpUrl = getWordPressUrl();
  const headers = getAuthHeaders();
  let allPosts: Post[] = [];
  let page = 1;
  const perPage = 100; // Max allowed by WP REST API
  let totalPages = 1; // Initialize to 1, will be updated after the first request

  if (DEBUG) console.log(`[WORDPRESS_API] Fetching posts${categoryId ? ` for category ${categoryId}` : ' (all published)'}.`);

  try {
    do {
      const params = new URLSearchParams({
        _embed: 'true',
        page: page.toString(),
        per_page: perPage.toString(),
        status: 'publish',
      });

      // Vi filtrerar bort inlägg med taggen "remade-snickeri" efter hämtning istället för med API-parametern

      if (categoryId) {
        params.set('categories', categoryId.toString());
      }

      const url = `${wpUrl}/wp-json/wp/v2/posts?${params.toString()}`;
      if (DEBUG) console.log(`[WORDPRESS_API] Fetching page ${page}/${totalPages || '?'} from: ${wpUrl}/wp-json/wp/v2/posts...`);
      if (DEBUG) console.log(`  Full URL: ${url}`);
      if (DEBUG) console.log('[WORDPRESS_API] Using Headers:', Object.keys(headers));
 
      // Re-enable auth headers
      const response = await fetch(url, {
        headers: headers, 
      });

      if (DEBUG) console.log(`[WORDPRESS_API] Response Status (Page ${page}): ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[WORDPRESS_API_ERROR] Failed to fetch posts (Page ${page}). Status: ${response.status}`);
        console.error(`[WORDPRESS_API_ERROR] Error Body: ${errorBody}`);
        // Throw a more specific error including the body if possible
        throw new Error(
          `HTTP error! status: ${response.status}, Body: ${errorBody.substring(0, 200)}...` // Truncate long error bodies
        );
      }

      // Get total pages from the header (only needed on the first request)
      // Explicitly type the response json
      const postsData: WordPressPostResponse[] = await response.json() as WordPressPostResponse[];
      if (page === 1) {
        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;
        if (DEBUG) console.log(`[WORDPRESS_API] Total pages found: ${totalPages}`);
      }

      const processedPosts = postsData.map(mapWordPressPostToPost);
      allPosts = allPosts.concat(processedPosts);

      page++;
    } while (page <= totalPages);

    // Filtrera bort inlägg med taggen eller kategorin "remade-snickeri"
    const filteredPosts = allPosts.filter(post => {
      // Kontrollera kategorier direkt från post.categories
      if (post.categories) {
        for (const category of post.categories) {
          if (category.slug.toLowerCase().includes('remade') && category.slug.toLowerCase().includes('snickeri')) {
            if (DEBUG) console.log(`[WORDPRESS_API] Filtering out post with category '${category.slug}': ${post.title.rendered}`);
            return false;
          }
        }
      }

      // Kontrollera om post._embedded finns och innehåller wp:term för taggar
      if (post._embedded && post._embedded['wp:term']) {
        // Gå igenom alla term-listor (kategorier, taggar, etc.)
        for (const termList of post._embedded['wp:term']) {
          // Gå igenom alla termer i listan
          for (const term of termList) {
            // Om termen är en tagg eller kategori och har slug som innehåller "remade" och "snickeri" (oberoende av skiftläge), filtrera bort inlägget
            if ((term.taxonomy === 'post_tag' || term.taxonomy === 'category') && 
                term.slug.toLowerCase().includes('remade') && 
                term.slug.toLowerCase().includes('snickeri')) {
              if (DEBUG) console.log(`[WORDPRESS_API] Filtering out post with ${term.taxonomy} '${term.slug}': ${post.title.rendered}`);
              return false;
            }
          }
        }
      }
      return true;
    });

    if (DEBUG) console.log(`[WORDPRESS_API] Successfully fetched ${allPosts.length} posts, filtered to ${filteredPosts.length} posts.`);
    return filteredPosts;

  } catch (error) {
    console.error('[WORDPRESS_API_ERROR] Error in getPosts function');
    if (error instanceof Error) {
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
    } else {
        console.error('Unknown error object:', error);
    }
    // Re-throw a consistent error message
    throw new Error(`Failed to get posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function mapWordPressPostToPost(post: WordPressPostResponse): Post {
  let featuredImage: string | undefined = undefined;
  
  if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
    const media: WPMedia = post._embedded['wp:featuredmedia'][0];
    featuredImage = media.media_details?.sizes?.large?.source_url || 
                    media.media_details?.sizes?.medium_large?.source_url || 
                    media.source_url;
  }

  let categories: { id: number; name: string; slug: string; }[] = [];
  if (post._embedded && post._embedded['wp:term']) {
    const termLists: WPTerm[][] = post._embedded['wp:term'];
    const categoryTerms = termLists.find((termList: WPTerm[]) => termList.some((term: WPTerm) => term.taxonomy === 'category'));

    if (categoryTerms) {
      categories = categoryTerms
        .filter((term: WPTerm) => term.taxonomy === 'category') 
        .map((term: WPTerm) => ({
            id: term.id,
            name: term.name,
            slug: term.slug
         }));
    }
  }

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    date: post.date,
    slug: post.slug,
    status: post.status,
    featuredImage: featuredImage,
    categories: categories
  };
}

/**
 * Fetches a single post from the WordPress REST API by its slug.
 * @param slug The slug of the post to fetch.
 * @returns A promise that resolves to the Post object or null if not found.
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const wpUrl = getWordPressUrl();
  const headers = getAuthHeaders(); // Use authentication

  if (DEBUG) console.log(`[WORDPRESS_API] Fetching single post by slug: ${slug}`);

  try {
    // The `slug` parameter queries for posts with the exact slug.
    // `_embed` is still useful to get linked data like featured image and categories.
    const params = new URLSearchParams({
      _embed: 'true',
      slug: slug,
      status: 'publish', // Ensure we only get published posts
    });

    const url = `${wpUrl}/wp-json/wp/v2/posts?${params.toString()}`;
    console.log(`  Full URL: ${url}`);

    const response = await fetch(url, {
      headers: headers,
    });

    if (DEBUG) console.log(`[WORDPRESS_API] Response Status (slug: ${slug}): ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // If status is 404, the post wasn't found (or wasn't published with that slug)
      if (response.status === 404) {
        if (DEBUG) console.log(`[WORDPRESS_API] Post with slug '${slug}' not found.`);
        return null; 
      }
      // Handle other errors
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody.substring(0, 200)}...`);
    }

    const postsData: WordPressPostResponse[] = await response.json() as WordPressPostResponse[];

    // The API returns an array even when querying by slug. It should contain 0 or 1 post.
    if (postsData.length === 0) {
      if (DEBUG) console.log(`[WORDPRESS_API] Post with slug '${slug}' found in response array, but array was empty.`);
      return null;
    }

    // Map the first (and likely only) result
    const post = mapWordPressPostToPost(postsData[0]);
    if (DEBUG) console.log(`[WORDPRESS_API] Successfully fetched post: ${post.title.rendered}`);
    return post;

  } catch (error) {
    console.error(`[WORDPRESS_API_ERROR] Error in getPostBySlug for slug: ${slug}`);
     if (error instanceof Error) {
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
    } else {
        console.error('Unknown error object:', error);
    }
    // Return null or re-throw depending on desired behavior for component
    // Returning null is often better for page components to handle gracefully
    return null;
  }
}

// Example usage or testing function
async function main() {
  if (DEBUG) console.log('Starting WordPress API Test');
  try {
    const posts = await getPosts();
    if (DEBUG) {
      console.log('Retrieved Posts:', posts.length);
      posts.forEach((post, index) => {
        console.log(`Post ${index + 1}:`, {
          id: post.id,
          title: post.title.rendered,
          slug: post.slug
        });
      }
    );
  }
  } catch (error) {
    console.error('Error retrieving posts:', error);
  }
}

// Only run main if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}