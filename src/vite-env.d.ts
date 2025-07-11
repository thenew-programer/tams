/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_LLM_API_KEY: string
  readonly VITE_LLM_API_URL: string
  readonly VITE_LLM_MODEL: string
  readonly VITE_CHROMA_API_KEY: string
  readonly VITE_CHROMA_TENANT: string
  readonly VITE_CHROMA_DATABASE: string
  readonly OPENAI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
