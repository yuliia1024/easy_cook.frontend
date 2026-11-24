import type { GoogleIdentity } from './google-identity';

const identity = { initialize: vi.fn(), renderButton: vi.fn(), disableAutoSelect: vi.fn() };

async function load() {
  vi.resetModules();
  return import('./google-identity');
}

describe('loadGoogleIdentity', () => {
  afterEach(() => {
    delete window.google;
    document.head.querySelectorAll('script').forEach((script) => script.remove());
  });

  it('uses the loaded library', async () => {
    window.google = { accounts: { id: identity as GoogleIdentity } };
    const { loadGoogleIdentity } = await load();
    await expect(loadGoogleIdentity()).resolves.toBe(identity);
    expect(document.head.querySelector('script')).toBeNull();
  });

  it('adds the script once and resolves when it loads', async () => {
    const { loadGoogleIdentity, GOOGLE_IDENTITY_SCRIPT } = await load();
    const first = loadGoogleIdentity();
    const second = loadGoogleIdentity();
    const scripts = document.head.querySelectorAll('script');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('src', GOOGLE_IDENTITY_SCRIPT);

    window.google = { accounts: { id: identity as GoogleIdentity } };
    scripts[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(identity);
    await expect(second).resolves.toBe(identity);
  });

  it('fails when the script does not load, and can be tried again', async () => {
    const { loadGoogleIdentity, GOOGLE_LOAD_FAILED } = await load();
    const attempt = loadGoogleIdentity();
    document.head.querySelector('script')!.dispatchEvent(new Event('error'));
    await expect(attempt).rejects.toMatchObject({ message: GOOGLE_LOAD_FAILED });
    expect(document.head.querySelector('script')).toBeNull();

    void loadGoogleIdentity().catch(() => undefined);
    expect(document.head.querySelectorAll('script')).toHaveLength(1);
  });
});
