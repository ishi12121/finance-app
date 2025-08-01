export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // neon db url
      DATABASE_URL: string;

      // app base url
      NEXT_PERPLEXITY_AI_URL: string;
      NEXT_PERPLEXITY_AI_KEY: string;
      NEXT_PUBLIC_APP_URL: string;
    }
  }
}
