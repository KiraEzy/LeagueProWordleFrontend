/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAX_ATTEMPTS: string;
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 