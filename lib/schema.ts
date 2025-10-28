import { z } from 'zod';

export const CameraModule = z.object({
  mp: z.number().nonnegative(),
  type: z.string().default(''),
});

export const Phone = z.object({
  name: z.string(),
  price: z.number(),
  cpu: z.string(),
  batteryMah: z.number(),
  screen: z.object({
    tech: z.string(),
    sizeIn: z.number(),
    resolution: z.string(),
  }),
  cameras: z.object({
    rear: z.array(CameraModule),
    frontMp: z.number(),
  }),
  refreshHz: z.number(),
  chargingW: z.number(),
  wirelessW: z.number().default(0),
  video: z.string().optional().default(''),
  features: z.object({
    headphone: z.boolean(),
    sim: z.string(),
  }),
});

export type Phone = z.infer<typeof Phone>;
