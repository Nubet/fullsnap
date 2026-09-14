export interface DeviceProfile {
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
}

export const DEFAULT_DEVICES: DeviceProfile[] = [
  // Apple Devices
  { name: 'iphone-se', viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'iphone-14', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'iphone-15-pro', viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'iphone-14-pro-max', viewport: { width: 428, height: 926 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'iphone-16-pro-max', viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  
  // Android Devices
  { name: 'pixel-9', viewport: { width: 412, height: 915 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'galaxy-s24', viewport: { width: 360, height: 800 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'pixel-7a', viewport: { width: 393, height: 851 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'android-small', viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  
  // Laptops & Desktops
  { name: 'laptop-1366', viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'macbook-pro-14', viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
  { name: 'desktop-1920', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'desktop-2560', viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
];

export interface CaptureWarning {
  type: string;
  message: string;
}

export interface CaptureResult {
  url: string;
  device: DeviceProfile;
  screenshotPath: string;
  status: 'success' | 'error';
  metrics: {
    width: number;
    height: number;
    loadTime: number;
    stabilizationTime: number;
  };
  warnings: CaptureWarning[];
  error?: string;
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();
  
  for (const item of items) {
    const p = task(item).then((res) => {
      results.push(res);
    });
    executing.add(p);
    const clean = p.finally(() => executing.delete(clean));
    
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}
