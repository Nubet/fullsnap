import { Command } from 'commander';
import { CaptureService, waitForServer } from '@norbert-fila/core';
import { loadConfig } from '@norbert-fila/config';
import { DEFAULT_DEVICES, runWithConcurrency } from '@norbert-fila/shared';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';
import ora from 'ora';
import Table from 'cli-table3';
import pc from 'picocolors';
import prompts from 'prompts';

export function createCli(): Command {
  const program = new Command();

  program
    .name('fullsnap')
    .description('Automated responsive visual inspection for developers')
    .version(process.env.CLI_VERSION || 'unknown');

  program
    .command('init')
    .description('Initialize a new fullsnap configuration file via interactive wizard')
    .action(async () => {
      console.log(pc.bold(pc.cyan(`\n📸 Initialize Fullsnap\n`)));
      
      const configPath = join(process.cwd(), 'fullsnap.config.js');
      if (existsSync(configPath)) {
        const { overwrite } = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: 'fullsnap.config.js already exists. Overwrite?',
          initial: false
        });
        if (!overwrite) {
          console.log(pc.gray('Aborted.'));
          return;
        }
      }

      const response = await prompts([
        {
          type: 'text',
          name: 'outputDir',
          message: 'Where should screenshots be saved?',
          initial: './screenshots'
        },
        {
          type: 'number',
          name: 'concurrency',
          message: 'How many browser tabs should run in parallel? (Lower is safer for RAM)',
          initial: 2,
          min: 1,
          max: 10
        },
        {
          type: 'multiselect',
          name: 'devices',
          message: 'Select default devices to test on:',
          choices: DEFAULT_DEVICES.map(d => ({
            title: `${d.name} ${pc.gray(`(${d.viewport.width}x${d.viewport.height})`)}`,
            value: d.name,
            selected: ['desktop-1920', 'macbook-pro-14', 'iphone-15-pro', 'galaxy-s24'].includes(d.name)
          })),
          min: 1,
          hint: '- Space to select. Return to submit'
        }
      ]);

      if (!response.devices) {
        console.log(pc.red('Initialization cancelled.'));
        return;
      }

      const configContent = `export default {
  devices: [
    ${response.devices.map((d: string) => `'${d}'`).join(',\n    ')}
  ],
  capture: {
    format: 'png',
    animations: 'disable',
    concurrency: ${response.concurrency}
  },
  output: '${response.outputDir}'
};
`;
      writeFileSync(configPath, configContent);
      console.log(pc.green(`\n✔ Created fullsnap.config.js successfully!\n`));
      console.log(`You can now run: ${pc.cyan('fullsnap https://your-website.com')}\n`);
    });

  // Main capture command
  program
    .argument('[url]', 'URL to capture')
    .option('-a, --all', 'Capture all available devices in the registry')
    .option('-d, --devices <list>', 'Comma-separated list of devices to capture (e.g. "iphone-14,desktop-1920")')
    .action(async (url: string | undefined, options) => {
      // If the user runs `fullsnap` without a URL or command, show help.
      if (!url) {
        program.help();
        return;
      }

      console.log(pc.bold(pc.cyan(`\n📸 Fullsnap: Visual Inspection\n`)));
      
      let targetUrl = url;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        if (targetUrl.startsWith('localhost') || targetUrl.startsWith('127.0.0.1')) {
          targetUrl = `http://${targetUrl}`;
        } else {
          targetUrl = `https://${targetUrl}`;
        }
      }
      
      const config = await loadConfig(process.cwd());
      const captureService = new CaptureService(config);
      const spinner = ora('Checking target environment...').start();
      
      try {
        if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
          spinner.text = 'Waiting for local development server to respond...';
          await waitForServer(targetUrl);
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
        
        const hostDir = new URL(targetUrl).hostname.replace(/[^a-z0-9]/gi, '_');
        const outputDir = join(process.cwd(), config.output || '.', hostDir, timestamp);
        mkdirSync(outputDir, { recursive: true });

        const total = targetDevices.length;
        let completed = 0;
        
        spinner.text = `Capturing 0/${total} devices (Concurrency: ${config.capture.concurrency})...`;

        const results = await runWithConcurrency(
          targetDevices, 
          config.capture.concurrency, 
          async (device) => {
            const res = await captureService.capture(targetUrl, device, outputDir);
            
            const timeStr = ((res.metrics.loadTime + res.metrics.stabilizationTime) / 1000).toFixed(1) + 's';
            
            spinner.clear();
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
