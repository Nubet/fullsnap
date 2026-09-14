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
    
    let scrollHeight = await this.page.evaluate(() => document.documentElement.scrollHeight);
    let maxScrolls = Math.ceil(scrollHeight / scrollStep);

    // Initial stabilization before any scroll
    await this.stabilizer.waitForStableState();

    for (let i = 0; i < maxScrolls; i++) {
      // Use mouse.wheel to trigger native scroll and JS-based smooth scrollers (like Lenis)
      await this.page.mouse.wheel(0, scrollStep);
      
      // Tiny delay to let event loop trigger IntersectionObservers before checking stability
      await this.page.waitForTimeout(150);
      
      await this.stabilizer.waitForStableState();
      
      // Check if page grew (e.g. infinite scroll loaded new content)
      const newScrollHeight = await this.page.evaluate(() => document.documentElement.scrollHeight);
      if (newScrollHeight > scrollHeight) {
        maxScrolls += Math.ceil((newScrollHeight - scrollHeight) / scrollStep);
        scrollHeight = newScrollHeight;
      }
      
      // Safety break to prevent infinite loops
      if (i > 50) break;
    }
  }
}
