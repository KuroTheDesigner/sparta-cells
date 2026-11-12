import { post } from '@/lib/ai/http';
import { chatInput } from '@/lib/ai/validation';
import { chat } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(chatInput, chat);
