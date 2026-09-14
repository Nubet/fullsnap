import { Command } from 'commander';
import { CaptureService } from '@fullsnap/core';
import { loadConfig } from '@fullsnap/config';
import { DEFAULT_DEVICES, runWithConcurrency } from '@fullsnap/shared';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

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
      
      const config = await loadConfig(process.cwd());
      const captureService = new CaptureService(config);
      
      try {
        await captureService.init();
        
        // Filter requested devices from DEFAULT_DEVICES (MVP subset selection)
        const targetDevices = DEFAULT_DEVICES.filter(d => 
          config.devices.includes(d.name)
        );
        
        if (targetDevices.length === 0) {
          console.warn('No matching devices found in config. Capturing all default devices.');
          targetDevices.push(...DEFAULT_DEVICES);
        }

        console.log(`Running captures with concurrency: ${config.capture.concurrency}`);
        
        const results = await runWithConcurrency(
          targetDevices, 
          config.capture.concurrency, 
          async (device) => {
            console.log(`[▶] Capturing ${device.name}...`);
            const res = await captureService.capture(url, device);
            console.log(`[✓] Captured ${device.name} in ${res.metrics.stabilizationTime}ms`);
            if (res.warnings.length) {
              console.warn(`[⚠] ${device.name} warnings:`, res.warnings.map(w => w.type).join(', '));
            }
            return res;
          }
        );
        
        const hostDir = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        const outputDir = join(process.cwd(), hostDir);
        
        mkdirSync(outputDir, { recursive: true });
        const reportPath = join(outputDir, 'report.json');
        
        writeFileSync(reportPath, JSON.stringify({ results }, null, 2));
        console.log(`\nCapture completed successfully. Report saved to: ${reportPath}`);
      } catch (error) {
        console.error('Error during capture:', error);
        process.exit(1);
      } finally {
        await captureService.close();
      }
    });

  return program;
}
