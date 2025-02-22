import 'dotenv/config';
import * as dotenv from 'dotenv';
import path from 'path';
import { env } from 'process';
import https from 'https';
import fetch, { FetchError, type RequestInit } from 'node-fetch';

// Ladda miljöspecifik konfiguration
const loadEnv = () => {
  const mode = process.env.NODE_ENV || 'development';
  const envFiles = [
    `.env.${mode}.local`,
    `.env.${mode}`,
    `.env.local`,
    '.env'
  ];

  envFiles.forEach(file => {
    const envPath = path.resolve(process.cwd(), file);
    try {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        console.warn(`[ENV_DEBUG] Could not load ${file}:`, result.error);
      } else {
        console.log(`[ENV_DEBUG] Loaded environment from ${file}`);
      }
    } catch (error) {
      console.warn(`[ENV_DEBUG] Error loading ${file}:`, error);
    }
  });
};

loadEnv();

// Robust HTTPS agent to handle various SSL scenarios
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false  // Be cautious with this in production
});

// Comprehensive error logging function
function logDetailedError(context: string, error: any) {
  console.error(`[WORDPRESS_API_ERROR] ${context}`);
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
  console.group('[WORDPRESS_AUTH_DEBUG]');
  
  const username = process.env.WORDPRESS_USERNAME || process.env.WP_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD || process.env.WP_APP_PASSWORD;

  console.log('🔐 Authentication Details:', {
    usedUsername: username,
    usernameLength: username?.length,
    passwordProvided: !!appPassword,
    passwordLength: appPassword ? appPassword.length : 0
  });

  if (!username || !appPassword) {
    console.error('❌ Missing WordPress Authentication Credentials');
    console.groupEnd();
    throw new Error('WordPress credentials are missing');
  }

  try {
    const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'FlowLearn WordPress Client/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    console.log('✅ Authentication Headers Generated', {
      authHeaderGenerated: true,
      headerLength: headers.Authorization.length
    });
    console.groupEnd();

    return headers;
  } catch (error) {
    console.error('[WORDPRESS_AUTH_GENERATION_ERROR]', error);
    console.groupEnd();
    throw error;
  }
}

// Helper function to get WordPress URL from various sources
function getWordPressUrl(): string {
  const envUrl = process.env.WORDPRESS_URL;
  const mode = import.meta.env.MODE || 'development';
  
  console.group('[WORDPRESS_URL_DEBUG]');
  console.log('Environment Details:', {
    envUrl,
    currentMode: mode,
    productionMode: import.meta.env.PROD,
    developmentMode: import.meta.env.DEV,
    nodeEnv: process.env.NODE_ENV
  });

  if (!envUrl) {
    console.error('❌ No WordPress URL configured');
    console.groupEnd();
    throw new Error('WordPress URL is not configured');
  }

  console.log('✅ Using WordPress URL:', envUrl);
  console.groupEnd();
  return envUrl;
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
  status?: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      id: number;
      source_url: string;
      media_type: string;
      mime_type: string;
      media_details?: {
        sizes: {
          [key: string]: {
            source_url: string;
            width: number;
            height: number;
          }
        }
      }
    }>
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
  categories: number[];
  status?: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

async function getCategories(): Promise<WordPressCategory[]> {
  try {
    const wpUrl = getWordPressUrl();
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/categories`, {
      headers: getAuthHeaders(),
      agent: httpsAgent
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    const categories = await response.json();
    console.log('📑 Available Categories:', categories.map(c => ({ name: c.name, id: c.id })));
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

let flowlearnCategoryId: number | null = null;

async function getFlowlearnCategoryId(): Promise<number | null> {
  if (flowlearnCategoryId !== null) {
    return flowlearnCategoryId;
  }

  const categories = await getCategories();
  const flowlearnCategory = categories.find(c => 
    c.slug === 'flowlearn' || c.name.toLowerCase() === 'flowlearn'
  );

  if (flowlearnCategory) {
    flowlearnCategoryId = flowlearnCategory.id;
    console.log('✅ Found Flowlearn category ID:', flowlearnCategoryId);
    return flowlearnCategoryId;
  }

  console.warn('⚠️ Flowlearn category not found');
  return null;
}

async function getMediaUrl(mediaId: number): Promise<string | undefined> {
  if (!mediaId) return undefined;
  
  try {
    const wpUrl = getWordPressUrl();
    const headers = getAuthHeaders();
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/media/${mediaId}`, {
      headers,
      agent: httpsAgent
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch media ${mediaId}:`, {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return undefined;
    }

    const media = await response.json();
    console.log(`[MEDIA_DEBUG] Media ${mediaId}:`, {
      sourceUrl: media.source_url,
      guid: media.guid?.rendered,
      link: media.link
    });

    return media.source_url || media.guid?.rendered;
  } catch (error) {
    console.error(`Error fetching media ${mediaId}:`, error);
    return undefined;
  }
}

export async function getPosts(page = 1, perPage = 10): Promise<Post[]> {
  try {
    const wpUrl = getWordPressUrl();
    if (!wpUrl) {
      throw new Error('WordPress URL is not configured');
    }

    const categoryId = await getFlowlearnCategoryId();
    
    let url = `${wpUrl}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&_embed`;
    if (categoryId) {
      url += `&categories=${categoryId}`;
      console.log('🔍 Filtering posts by Flowlearn category:', categoryId);
    } else {
      console.log('⚠️ No category filter applied - showing all posts');
    }

    console.group('[WORDPRESS_REQUEST_DEBUG]');
    console.log('🌐 Request URL:', url);

    const headers = getAuthHeaders();
    
    // Lägg till extra debugging för CORS och headers
    console.log('🔒 Request Headers:', {
      Authorization: headers.Authorization ? 'Provided' : 'Missing',
      'User-Agent': headers['User-Agent'],
      'Accept': headers['Accept']
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      agent: httpsAgent
    });

    console.log('🚦 Response Status:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      console.error('🚨 WordPress API Error:', errorDetails);
      
      // Specifik CORS-felsökning
      if (response.status === 403) {
        console.warn('⚠️ Potential CORS or Authentication Issue', {
          currentOrigin: 'N/A', // window.location.origin is not available in Node.js
          wpUrl,
          configuredCORSDomains: 'Check WordPress CORS settings'
        });
      }

      throw new Error(`WordPress API Error: ${response.status} - ${response.statusText}`);
    }

    const posts: WordPressPostResponse[] = await response.json();
    
    console.log('📊 Fetched Posts:', {
      totalPosts: posts.length,
      firstPostTitle: posts[0]?.title?.rendered || 'No posts'
    });

    // Hämta bilder för alla inlägg parallellt
    const postsWithImages = await Promise.all(posts.map(async post => {
      console.group(`[POST_DEBUG] ${post.slug}`);
      console.log('Featured Media ID:', post.featured_media);
      
      let featuredImageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
      
      if (!featuredImageUrl && post.featured_media) {
        featuredImageUrl = await getMediaUrl(post.featured_media);
      }

      console.log('Featured Image URL:', featuredImageUrl);
      console.groupEnd();

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        date: post.date,
        slug: post.slug,
        featuredImage: featuredImageUrl,
        categories: post.categories,
        status: post.status
      };
    }));

    console.groupEnd();
    return postsWithImages;

  } catch (error) {
    console.error('[WORDPRESS_FETCH_COMPREHENSIVE_ERROR]', error);
    console.groupEnd();
    throw error;
  }
}

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