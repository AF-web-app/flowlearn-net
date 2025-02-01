/// <reference types="next" />
/// <reference types="next/types/global" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript

export interface NewsItem {
  id: number;
  attributes: {
    title: string;
    excerpt?: string;
    content: string;
    publishedDate?: string;
  };
}

export function getNews(): Promise<NewsItem[]>;
export function formatContent(content: string): string;

declare module 'marked' {
  export function marked(markdown: string): string;
}

declare module 'mysql2/promise' {
  // Add minimal type definitions for mysql2/promise
  export function createConnection(config: any): Promise<any>;
}
