import { Command } from 'commander';
import { CaptureService } from '@fullsnap/core';
import { ConfigSchema } from '@fullsnap/config';
import { DEFAULT_DEVICES } from '@fullsnap/shared';

export function createCli(): Command {
  const program = new Command();

  program
    .name('fullsnap')
    .description('Automated responsive visual inspection for developers')
    .version('0.1.0');

  program
    .argument('<url>', 'URL to capture')
    .action(async (url: string) => {
      console.log(`Starting capture for: ${url}`);
      
      const config = ConfigSchema.parse({});
      const captureService = new CaptureService(config);
      
      try {
        await captureService.init();
        
        for (const device of DEFAULT_DEVICES) {
          console.log(`Capturing ${device.name}...`);
          await captureService.capture(url, device);
        }
        
        console.log('Capture completed successfully.');
      } catch (error) {
        console.error('Error during capture:', error);
        process.exit(1);
      } finally {
        await captureService.close();
      }
    });

  return program;
}
