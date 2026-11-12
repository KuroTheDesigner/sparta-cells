import { post } from '@/lib/ai/http';
import { storeInput } from '@/lib/ai/validation';
import { stores } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(storeInput, stores);
