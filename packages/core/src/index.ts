import { chromium, type Browser } from 'playwright';
import type { Config } from '@norbert-fila/config';
import type { DeviceProfile, CaptureResult, CaptureWarning } from '@norbert-fila/shared';
import path from 'node:path';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
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

  async capture(url: string, device: DeviceProfile, outputDir: string): Promise<CaptureResult> {
    if (!this.browser) {
      throw new Error('CaptureService not initialized');
    }

    const warnings: CaptureWarning[] = [];
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
    
    const loadStart = performance.now();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      warnings.push({ type: 'navigation-timeout', message: String(e) });
    }
    const loadTime = performance.now() - loadStart;

    await page.evaluate(async () => {
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    });

    if (this.config.capture.animations === 'disable') {
      await stabilizer.disableAnimations();
    }

    const stabStart = performance.now();
    try {
      await scrollEngine.scrollToEnd();
    } catch (e) {
      warnings.push({ type: 'layout-instability', message: String(e) });
    }
    const stabilizationTime = performance.now() - stabStart;

    // Flatten fixed/sticky elements so they don't appear in the middle of the screenshot
    await stabilizer.flattenFixedElements();

    const fileName = `${device.name}.png`;
    const outputPath = path.join(outputDir, fileName);

    await page.screenshot({ path: outputPath, fullPage: true });

    await context.close();

    return {
      url,
      device,
      screenshotPath: outputPath,
      status: warnings.length > 0 ? 'error' : 'success',
      metrics: {
        width: device.viewport.width,
        height: device.viewport.height,
        loadTime: Math.round(loadTime),
        stabilizationTime: Math.round(stabilizationTime)
      },
      warnings
    };
  }
}

export { waitForServer } from './utils/wait-for-server.js';
