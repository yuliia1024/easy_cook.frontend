import { ApiError } from '../../api/http';

/** Google Identity Services (https://developers.google.com/identity/gsi/web/reference/js-reference). */
export const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

export interface GoogleCredentialResponse {
  /** The Google ID token (JWT). */
  credential: string;
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
}

export interface GoogleIdentity {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    /** Bound into the ID token; the backend checks it against its nonce cookie. */
    nonce?: string;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

export const GOOGLE_LOAD_FAILED =
  'Google sign-in could not load. Check the connection and try again.';

let loading: Promise<GoogleIdentity> | null = null;

/** Loads the GIS script once; a failed load can be tried again. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const loaded = window.google?.accounts?.id;
  if (loaded) return Promise.resolve(loaded);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    const fail = (): void => {
      loading = null;
      script.remove();
      reject(new ApiError(0, GOOGLE_LOAD_FAILED));
    };
    script.onload = () => {
      const identity = window.google?.accounts?.id;
      if (identity) resolve(identity);
      else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}
