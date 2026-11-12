import { post } from '@/lib/ai/http';
import { tokenInput } from '@/lib/ai/validation';
import { liveToken } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(tokenInput, liveToken, true);
