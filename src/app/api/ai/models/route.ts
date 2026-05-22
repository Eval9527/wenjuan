import { getPublicAiModelOptions } from '@/features/ai-assistant/model-config';

export async function GET() {
  return Response.json(getPublicAiModelOptions());
}
