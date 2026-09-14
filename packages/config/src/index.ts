import { z } from 'zod';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ConfigSchema = z.object({
  devices: z.array(z.string()).default(['desktop', 'mobile']),
  capture: z.object({
    format: z.enum(['png', 'jpeg']).default('png'),
    animations: z.enum(['wait', 'disable', 'allow']).default('wait'),
    concurrency: z.number().default(3),
  }).default({}),
  output: z.string().default('./screenshots'),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(cwd: string): Promise<Config> {
  const configPath = resolve(cwd, 'fullsnap.config.js');
  
  if (existsSync(configPath)) {
    try {
      const mod = await import(pathToFileURL(configPath).href);
      return ConfigSchema.parse(mod.default || mod);
    } catch (e) {
      console.warn(`[Config] Failed to load config at ${configPath}`, e);
    }
  }
  
  // Default fallback
  return ConfigSchema.parse({});
}
