import { Command } from 'commander';
import { CaptureService, waitForServer } from '@fullsnap/core';
import { loadConfig } from '@fullsnap/config';
import { DEFAULT_DEVICES, runWithConcurrency } from '@fullsnap/shared';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';
import ora from 'ora';
import Table from 'cli-table3';
import pc from 'picocolors';

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
      console.log(pc.bold(pc.cyan(`\n📸 Fullsnap: Visual Inspection\n`)));
      
      const config = await loadConfig(process.cwd());
      const captureService = new CaptureService(config);
      const spinner = ora('Checking target environment...').start();
      
      try {
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          spinner.text = 'Waiting for local development server to respond...';
          await waitForServer(url);
        }

        spinner.text = 'Initializing CaptureService...';
        await captureService.init();
        
        let targetDevices = [];
        
        if (options.all) {
          targetDevices = [...DEFAULT_DEVICES];
        } else if (options.devices) {
          const requested = options.devices.split(',').map((s: string) => s.trim());
          targetDevices = DEFAULT_DEVICES.filter(d => requested.includes(d.name));
        } else {
          targetDevices = DEFAULT_DEVICES.filter(d => config.devices.includes(d.name));
        }
        
        if (targetDevices.length === 0) {
          targetDevices = [...DEFAULT_DEVICES];
        }

        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
        const timestamp = localISOTime.replace('T', '_').replace(/:/g, '-').split('.')[0];
        
        const hostDir = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        const outputDir = join(process.cwd(), config.output || '.', hostDir, timestamp);
        mkdirSync(outputDir, { recursive: true });

        const total = targetDevices.length;
        let completed = 0;
        
        spinner.text = `Capturing 0/${total} devices (Concurrency: ${config.capture.concurrency})...`;

        const results = await runWithConcurrency(
          targetDevices, 
          config.capture.concurrency, 
          async (device) => {
            const res = await captureService.capture(url, device, outputDir);
            
            const timeStr = ((res.metrics.loadTime + res.metrics.stabilizationTime) / 1000).toFixed(1) + 's';
            
            spinner.clear(); // Temporarily clear spinner to print line above it
            if (res.warnings.length) {
              console.log(`${pc.yellow('⚠')} ${pc.bold(device.name)} captured in ${timeStr} ${pc.gray(`(${res.warnings.map(w => w.type).join(', ')})`)}`);
            } else {
              console.log(`${pc.green('✔')} ${pc.bold(device.name)} captured in ${timeStr}`);
            }
            
            completed++;
            spinner.text = `Capturing ${completed}/${total} devices (Concurrency: ${config.capture.concurrency})...`;
            
            return res;
          }
        );
        
        spinner.succeed(`Capture complete! Output saved to: ${pc.gray(outputDir)}`);

        const reportPath = join(outputDir, 'report.json');
        writeFileSync(reportPath, JSON.stringify({ results }, null, 2));

        const table = new Table({
          head: [
            pc.bold('Device'), 
            pc.bold('Viewport'), 
            pc.bold('Time'), 
            pc.bold('Status'), 
            pc.bold('Warnings')
          ],
          style: { head: [] } 
        });

        for (const res of results) {
          const isWarn = res.warnings.length > 0;
          const status = res.status === 'error' ? pc.red('ERROR') : (isWarn ? pc.yellow('WARNING') : pc.green('SUCCESS'));
          const warningsStr = isWarn ? res.warnings.map(w => w.type).join(', ') : pc.gray('None');
          const timeStr = ((res.metrics.loadTime + res.metrics.stabilizationTime) / 1000).toFixed(1) + 's';
          const viewport = `${res.device.viewport.width}x${res.device.viewport.height}`;

          table.push([
            res.device.name,
            viewport,
            timeStr,
            status,
            warningsStr
          ]);
        }

        console.log('\n' + table.toString() + '\n');
      } catch (error) {
        spinner.fail(`Capture failed.`);
        console.error(pc.red(String(error)));
        process.exit(1);
      } finally {
        await captureService.close();
      }
    });

  return program;
}
