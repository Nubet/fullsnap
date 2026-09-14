import { chromium, type Browser } from 'playwright';
import type { Config } from '@fullsnap/config';
import type { DeviceProfile } from '@fullsnap/shared';
import path from 'node:path';
import { URL } from 'node:url';
import { PageStabilizer } from './stabilization/page-stabilizer.js';
import { ScrollEngine } from './scrolling/scroll-engine.js';

export class CaptureService {
  private browser: Browser | null = null;

  constructor(private readonly config: Config) {}

  async init(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async capture(url: string, device: DeviceProfile): Promise<void> {
    if (!this.browser) {
      throw new Error('CaptureService not initialized');
    }

    const context = await this.browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      userAgent: device.userAgent,
    });

    const page = await context.newPage();
    const stabilizer = new PageStabilizer(page);
    const scrollEngine = new ScrollEngine(page, stabilizer);
    
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for fonts
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    if (this.config.capture.animations === 'disable') {
      await stabilizer.disableAnimations();
    }

    // Scroll through the entire page
    await scrollEngine.scrollToEnd();

    // Reset scroll to top before screenshot (Playwright handles fullPage internally, but good practice)
    await page.evaluate(() => window.scrollTo(0, 0));
    await stabilizer.waitForStableState();

    const parsedUrl = new URL(url);
    const hostDir = parsedUrl.hostname.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${device.name}.png`;
    const outputPath = path.join(process.cwd(), hostDir, fileName);

    await page.screenshot({ path: outputPath, fullPage: true });

    await context.close();
  }
}
