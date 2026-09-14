import { Command } from 'commander';

export function createCli(): Command {
  const program = new Command();

  program
    .name('fullsnap')
    .description('Automated responsive visual inspection for developers')
    .version('0.1.0');

  program
    .argument('<url>', 'URL to capture')
    .action((url) => {
      console.log(`Starting capture for: ${url}`);
    });

  return program;
}
