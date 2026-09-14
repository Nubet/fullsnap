import type { Page } from 'playwright';
import { PageStabilizer } from '../stabilization/page-stabilizer.js';

export class ScrollEngine {
  constructor(
    private readonly page: Page,
    private readonly stabilizer: PageStabilizer
  ) {}

  public async scrollToEnd(): Promise<void> {
    const viewportHeight = this.page.viewportSize()?.height ?? 900;
    const scrollStep = viewportHeight * 0.8;
    
    let previousHeight = 0;
    let currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

    // Initial stabilization before any scroll
    await this.stabilizer.waitForStableState();

    while (previousHeight < currentHeight) {
      previousHeight = currentHeight;
      
      await this.page.evaluate((step) => {
        window.scrollBy(0, step);
      }, scrollStep);
      
      await this.stabilizer.waitForStableState();
      
      currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
    }
  }
}
