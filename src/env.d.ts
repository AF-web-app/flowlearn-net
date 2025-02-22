/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
import type { Post } from './lib/wordpress';

interface Window {
  __INITIAL_POSTS__: Post[];
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}