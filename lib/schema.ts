import { z } from "zod";

export const CameraModule = z.object({
  mp: z.number().nonnegative(),
  type: z.string().default(""),
});

export const Phone = z.object({
  name: z.string(),
  price: z.number().nullable(),
  cpu: z.string().nullable(),
  batteryMah: z.number().nullable(),
  screen: z.object({
    tech: z.string().nullable(),
    sizeIn: z.number().nullable(),
    resolution: z.string().nullable(),
  }),
  cameras: z.object({
    rear: z.array(CameraModule).nullable(),
    frontMp: z.number().nullable(),
  }),
  refreshHz: z.number().nullable(),
  chargingW: z.number().nullable(),
  wirelessW: z.number().nullable().default(0),
  video: z.string().nullable().optional().default(""),
  features: z.object({
    headphone: z.boolean().nullable(),
    sim: z.string().nullable(),
  }),
});

export type Phone = z.infer<typeof Phone>;
