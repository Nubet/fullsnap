import type { Page } from 'playwright';

export class PageStabilizer {
  constructor(private readonly page: Page) {}

  public async waitForStableState(): Promise<void> {
    await this.page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let timeoutId: number;
        let fallbackTimeoutId: number;
        const STABILITY_DELAY = 400; // ms without mutations
        const MAX_WAIT = 5000; // max 5s per step

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

        const checkStability = async () => {
          await waitForImages();
          observer.disconnect();
          clearTimeout(fallbackTimeoutId);
          resolve();
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

        // If it never stabilizes, force resolve after MAX_WAIT
        fallbackTimeoutId = window.setTimeout(() => {
          observer.disconnect();
          resolve(); // Resolve anyway to continue pipeline
        }, MAX_WAIT);

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

  public async flattenFixedElements(): Promise<void> {
    await this.page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.currentNode;
      
      while (node) {
        if (node instanceof HTMLElement) {
          const style = window.getComputedStyle(node);
          if (style.position === 'fixed') {
            node.style.setProperty('position', 'absolute', 'important');
          } else if (style.position === 'sticky') {
            node.style.setProperty('position', 'relative', 'important');
          }
        }
        node = walker.nextNode();
      }
    });
  }
}
