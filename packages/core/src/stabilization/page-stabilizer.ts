import type { Page } from 'playwright';

export class PageStabilizer {
  constructor(private readonly page: Page) {}

  public async waitForStableState(): Promise<void> {
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let timeoutId: number;
        const STABILITY_DELAY = 400; // ms without mutations to consider stable

        const waitForImages = async () => {
          const images = Array.from(document.images);
          await Promise.all(
            images.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise<void>((res) => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
              });
            })
          );
        };

        const observer = new MutationObserver(() => {
          clearTimeout(timeoutId);
          timeoutId = window.setTimeout(checkStability, STABILITY_DELAY);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });

        const checkStability = async () => {
          await waitForImages();
          observer.disconnect();
          resolve();
        };

        timeoutId = window.setTimeout(checkStability, STABILITY_DELAY);
      });
    });
  }

  public async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }
}
