import { URL } from 'node:url';

/**
 * Checks if URL is localhost and pings it until it responds or times out.
 * Prevents ERR_CONNECTION_REFUSED when starting CLI together with a dev server.
 */
export async function waitForServer(targetUrl: string, timeoutMs: number = 60000): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return; // Ignore invalid URLs, let Playwright fail normally
  }

  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    return;
  }

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000); // 2s timeout per ping

      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(id);

      // Any valid HTTP response means the server is UP.
      if (res.status >= 200 && res.status < 500) {
        // Add a tiny delay after first successful ping to let dev server fully stabilize
        await new Promise((r) => setTimeout(r, 1500));
        return;
      }
    } catch (error) {
    }

    await new Promise((r) => setTimeout(r, 1000)); // Wait 1s before next ping
  }

  throw new Error(`Timeout: Local development server at ${targetUrl} did not respond within ${timeoutMs / 1000}s`);
}
