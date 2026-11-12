import { post } from '@/lib/ai/http';
import { locationInput } from '@/lib/ai/validation';
import { locate } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(locationInput, locate);
