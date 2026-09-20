import type { Page } from 'playwright';
import { PageStabilizer } from '../stabilization/page-stabilizer.js';

export class ScrollEngine {
  constructor(
    private readonly page: Page,
    private readonly stabilizer: PageStabilizer
  ) {}

  public async scrollToEnd(): Promise<void> {
    const viewportHeight = this.page.viewportSize()?.height ?? 900;
    const scrollStep = viewportHeight * 0.9;

    // Initial stabilization before any scroll
    await this.stabilizer.waitForStableState();

    let previousScrollHeight = 0;
    for (let i = 0; i < 50; i++) {
      const state = await this.page.evaluate((step) => {
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
        const target = Math.min(window.scrollY + step, Math.max(0, scrollHeight - window.innerHeight));
        // CSS `scroll-behavior: smooth` can make a full-page capture spend
        // seconds chasing a target that never arrives before the next step.
        document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
        window.scrollTo(0, target);
        return { scrollHeight, target };
      }, scrollStep);

      await this.page.waitForTimeout(50);
      await this.stabilizer.waitForStableState(250);

      const atEnd = await this.page.evaluate(() =>
        window.scrollY + window.innerHeight >= Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0) - 2
      );
      const grew = state.scrollHeight > previousScrollHeight;
      previousScrollHeight = state.scrollHeight;

      if (atEnd && !grew) {
        break;
      }
    }
  }
}
