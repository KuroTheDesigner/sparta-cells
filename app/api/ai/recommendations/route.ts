import { post } from '@/lib/ai/http';
import { recommendationInput } from '@/lib/ai/validation';
import { recommendPhones } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(recommendationInput, recommendPhones);
