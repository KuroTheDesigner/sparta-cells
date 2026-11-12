import { post } from '@/lib/ai/http';
import { searchInput } from '@/lib/ai/validation';
import { searchPhones } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = post(searchInput, searchPhones);
