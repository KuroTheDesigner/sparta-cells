import { post } from '@/lib/ai/http';
import { reviewInput } from '@/lib/ai/validation';
import { reviews } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(reviewInput, reviews);
