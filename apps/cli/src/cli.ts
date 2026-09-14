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
    .option('-a, --all', 'Capture all available devices in the registry')
    .option('-d, --devices <list>', 'Comma-separated list of devices to capture (e.g. "iphone-14,desktop-1920")')
    .action(async (url: string, options) => {
      console.log(`Starting capture for: ${url}`);
      
      const config = await loadConfig(process.cwd());
      const captureService = new CaptureService(config);
      
      try {
        await captureService.init();
        
        let targetDevices = [];
        
        if (options.all) {
          targetDevices = [...DEFAULT_DEVICES];
          console.log(`Override: Capturing ALL ${DEFAULT_DEVICES.length} devices.`);
        } else if (options.devices) {
          const requested = options.devices.split(',').map((s: string) => s.trim());
          targetDevices = DEFAULT_DEVICES.filter(d => requested.includes(d.name));
          console.log(`Override: Capturing specified devices: ${requested.join(', ')}`);
        } else {
          // Default to config
          targetDevices = DEFAULT_DEVICES.filter(d => config.devices.includes(d.name));
        }
        
        if (targetDevices.length === 0) {
          console.warn('No matching devices found in overrides or config. Capturing all default devices.');
          targetDevices = [...DEFAULT_DEVICES];
        }

        console.log(`Running captures with concurrency: ${config.capture.concurrency}`);
        
        // Generate a sortable timestamp: YYYY-MM-DD_HH-mm-ss
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000; // local offset
        const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
        const timestamp = localISOTime.replace('T', '_').replace(/:/g, '-').split('.')[0];
        
        const hostDir = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        const outputDir = join(process.cwd(), config.output || '.', hostDir, timestamp);
        mkdirSync(outputDir, { recursive: true });

        console.log(`\nOutput directory: ${outputDir}\n`);

        const results = await runWithConcurrency(
          targetDevices, 
          config.capture.concurrency, 
          async (device) => {
            console.log(`[▶] Capturing ${device.name}...`);
            const res = await captureService.capture(url, device, outputDir);
            console.log(`[✓] Captured ${device.name} in ${res.metrics.stabilizationTime}ms`);
            if (res.warnings.length) {
              console.warn(`[⚠] ${device.name} warnings:`, res.warnings.map(w => w.type).join(', '));
            }
            return res;
          }
        );
        
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
