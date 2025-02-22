import 'dotenv/config';
import mysql from 'mysql2/promise';
import type { Connection } from 'mysql2/promise';

/// <reference types="node" />

const isProduction = process.env.NODE_ENV === 'production';

export function getDatabaseConfig() {
  const possibleHosts = [
    process.env.DB_HOST || '127.0.0.1', 
    'localhost', 
    '127.0.0.1'
  ];

  return {
    host: possibleHosts.find(host => host) || '127.0.0.1',
    user: process.env.DB_USER || 'flowlearn',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'News-info',
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: isProduction ? { rejectUnauthorized: true } : undefined
  };
}

export async function getConnection() {
  try {
    const connection = await mysql.createConnection({
      ...getDatabaseConfig(),
      typeCast: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    return connection;
  } catch (error) {
    console.error('Databasanslutningsfel:', error);
    throw new Error('Kunde inte ansluta till databasen. Kontrollera dina inställningar.');
  }
}

export async function executeQuery<T = any>(query: string, params: any[] = []) {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results as T[];
  } finally {
    await connection.end();
  }
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  image_url?: string;
  published_date: Date;
  created_at: Date;
  updated_at: Date;
}

export async function getAllBlogPosts(limit: number = 10, offset: number = 0): Promise<BlogPost[]> {
  const query = `
    SELECT * FROM blog_posts 
    ORDER BY published_date DESC 
    LIMIT ? OFFSET ?
  `;
  const results = await executeQuery(query, [limit, offset]);
  return results as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const query = 'SELECT * FROM blog_posts WHERE slug = ?';
  const results = await executeQuery<BlogPost>(query, [slug]);
  return results && results.length > 0 ? results[0] : null;
}

export async function createBlogPost(post: Omit<BlogPost, 'id' | 'published_date' | 'created_at' | 'updated_at'>): Promise<number> {
  const query = `
    INSERT INTO blog_posts 
    (title, slug, excerpt, content, image_url) 
    VALUES (?, ?, ?, ?, ?)
  `;
  const results = await executeQuery(query, [
    post.title, 
    post.slug, 
    post.excerpt || null, 
    post.content, 
    post.image_url || null
  ]);
  return (results as any).insertId;
}
