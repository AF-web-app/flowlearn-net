/// <reference types="astro/astro-jsx" />

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }

  interface IntrinsicAttributes {
    'client:load'?: boolean;
    'client:idle'?: boolean;
    'client:visible'?: boolean;
    'client:media'?: string;
    'client:only'?: boolean | string;
  }
}

declare global {
  namespace astroHTML.JSX {
    interface AstroHTMLAttributes {
      class?: string;
      charset?: string;
    }
    
    interface HTMLAttributes {
      class?: string;
    }
  }
}
