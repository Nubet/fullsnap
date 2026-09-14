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
  {
    name: 'desktop',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  }
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
