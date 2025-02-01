/// <reference path="../.astro/types.d.ts" />
import type { Post } from './lib/wordpress';

interface Window {
  __INITIAL_POSTS__: Post[];
}