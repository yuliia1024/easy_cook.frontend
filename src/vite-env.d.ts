/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** OAuth client ID (Web) of the Google sign-in button. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
