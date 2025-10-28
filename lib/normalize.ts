import { z } from 'zod';
import { Phone as PhoneSchema, type Phone } from './schema';

// Raw phone type matches the previous static HTML fields
const Raw = z.object({
  name: z.string(),
  price: z.number(),
  cpu: z.string(),
  battery: z.string(), // e.g. "5000 mAh"
  screen: z.string(),  // e.g. "AMOLED/OLED" or "E5 AMOLED"
  rearCam: z.string(), // may contain newlines
  frontCam: z.string(), // e.g. "32MP"
  refresh: z.string(), // e.g. "120Hz (1-120Hz)"
  size: z.string(),    // e.g. "6.73\""
  charging: z.string(),// e.g. "120W" or "65W/80W*"
  video: z.string().optional().default(''),
  wireless: z.string(), // "Yes (50W)" | "No"
  resolution: z.string(),
  headphone: z.string(), // "Yes" | "No"
  sim: z.string(),
});

export type RawPhone = z.infer<typeof Raw>;

export function normalizePhones(raw: RawPhone[]): Phone[] {
  return raw.map(r => {
    const batteryMah = parseInt(r.battery.replace(/[^0-9]/g, ''), 10) || 0;
    const sizeIn = parseFloat(r.size.replace(/[^0-9.]/g, '')) || 0;
    const refreshHz = maxNumber(r.refresh) || 0;
    const chargingW = maxNumber(r.charging) || 0;
    const wirelessW = /yes/i.test(r.wireless) ? maxNumber(r.wireless) : 0;
    const frontMp = firstNumber(r.frontCam) || 0;
    const rear = parseRearModules(r.rearCam);
    const headphone = /yes/i.test(r.headphone);
    const tech = r.screen.split('/')[0].trim();
    const phone = {
      name: r.name,
      price: r.price,
      cpu: r.cpu.replace('†','').trim(),
      batteryMah,
      screen: { tech, sizeIn, resolution: r.resolution },
      cameras: { rear, frontMp },
      refreshHz,
      chargingW,
      wirelessW,
      video: r.video || '',
      features: { headphone, sim: r.sim },
    } satisfies Phone;
    return PhoneSchema.parse(phone);
  });
}

function firstNumber(s: string): number {
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function maxNumber(s: string): number {
  const matches = s.match(/\d+(?:\.\d+)?/g) || [];
  return matches.length ? Math.max(...matches.map(Number)) : 0;
}

function parseRearModules(s: string) {
  // Supports "50MP (Wide)\n12MP (Ultrawide)" and "50MP + 12MP + 5MP" forms
  const parts = s.split(/\n|\+/).map(p => p.trim()).filter(Boolean);
  return parts.map(p => {
    const mp = firstNumber(p);
    const typeMatch = p.match(/\)\s*(.+)$/) || p.match(/\b(Wide|Ultrawide|Telephoto|Macro|Monochrome|Telemacro)\b/i);
    const type = typeMatch ? typeMatch[1] || typeMatch[0] : '';
    return { mp, type };
  });
}

export type { Phone };
