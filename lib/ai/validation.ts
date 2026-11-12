import 'server-only';
import { z } from 'zod';
import { Phone } from '../schema';

const text = z.string().trim().min(1).max(4000);
const name = z.string().trim().min(1).max(160);
const number = z.number().finite().nonnegative();
// Require every authoritative Phone field; its defaults must not fill missing research.
export const researchedPhone = Phone.extend({
  name, price: number.nullable(), cpu: name.nullable(), batteryMah: number.positive().nullable(),
  screen: z.object({ tech: name.nullable(), sizeIn: number.positive().nullable(), resolution: name.nullable() }).strict(),
  cameras: z.object({ rear: z.array(z.object({ mp: number, type: z.string().max(100) }).strict()).min(1).max(8).nullable(), frontMp: number.nullable() }).strict(),
  refreshHz: number.positive().nullable(), chargingW: number.nullable(), wirelessW: number.nullable(),
  video: z.string().max(1000).nullable(), features: z.object({ headphone: z.boolean().nullable(), sim: name.nullable() }).strict(),
}).strict();
const phones = z.array(researchedPhone).max(60);
const filters = z.object({
  query: z.string().max(200), priceRange: z.tuple([number, number]).refine(([a, b]) => a <= b),
  cpu: z.array(name).max(60), batteryMah: z.array(number).max(60), screenTech: z.array(name).max(60),
  refreshHz: z.array(number).max(60), chargingW: z.array(number).max(60), wireless: z.array(z.enum(['Yes', 'No'])).max(2),
}).strict();
export const searchInput = z.object({ description: text, country: name, currency: z.string().regex(/^[A-Z]{3}$/), filters: filters.optional() }).strict();
export const recommendationInput = z.object({ priorities: text, phones: phones.min(1), currency: z.string().regex(/^[A-Z]{3}$/).default('NGN') }).strict();
export const chatInput = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: text }).strict()).min(1).max(30),
  phones, thinking: z.boolean().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).default('NGN'),
  audio: z.object({ data: z.string().min(4).max(2_800_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/), mimeType: z.enum(['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/ogg;codecs=opus']) }).strict().optional(),
}).strict().refine(v => v.messages.at(-1)?.role === 'user', 'Last message must be from the user');
export const locationInput = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).strict();
export const storeInput = locationInput.partial().extend({ phoneName: name, location: name.optional() }).strict().refine(v => (v.latitude !== undefined && v.longitude !== undefined) || (v.latitude === undefined && v.longitude === undefined && !!v.location), 'Supply both coordinates or a location');
export const reviewInput = z.object({ phoneName: name, reviews: z.array(z.object({ author: name, rating: z.number().finite().min(1).max(5), comment: text }).strict()).max(100).optional() }).strict();
export const tokenInput = z.object({}).strict();

export function safeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !!url.hostname &&
      !url.hostname.includes(':') && !/^\d+(\.\d+){3}$/.test(url.hostname) &&
      url.hostname !== 'localhost' && url.hostname.includes('.') && !/\.(local|internal|test|invalid)$/.test(url.hostname);
  } catch { return false; }
}
export const sourceSchema = z.object({ title: name, url: z.string().max(2048).refine(safeUrl) }).strict();
