import type { Config } from '@fullsnap/config';
import type { DeviceProfile } from '@fullsnap/shared';

export class CaptureService {
  constructor(private readonly config: Config) {}

  public async capture(url: string, device: DeviceProfile): Promise<void> {
    // Phase 1 implementation pending
    console.log(`[Core] Capturing ${url} on ${device.name}`);
  }
}
