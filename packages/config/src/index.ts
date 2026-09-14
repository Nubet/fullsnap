import { z } from 'zod';

export const ConfigSchema = z.object({
  devices: z.array(z.string()).default(['desktop', 'mobile']),
  capture: z.object({
    format: z.enum(['png', 'jpeg']).default('png'),
    animations: z.enum(['wait', 'disable', 'allow']).default('wait'),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
