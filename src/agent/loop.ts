import { getApiKey } from '@/storage/apiKey';
import { executeTool, toolDefinitions } from '@/tools';
import { MAX_AGENT_ITERATIONS, MODEL, systemPrompt } from './systemPrompt';
import { todayIso } from '@/tools/utils';

const API_URL = 'https://api.anthropic.com/v1/messages';

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

type Message = {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
};

type ApiResponse = {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
};

async function anthropicRequest(body: Record<string, unknown>): Promise<ApiResponse> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('Configura tu API key de Anthropic en Ajustes.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<ApiResponse>;
}

function extractText(content: ContentBlock[]): string {
  return content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function runAgent(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const contextNote = `Fecha de hoy: ${todayIso()}.`;

  const messages: Message[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const tools = toolDefinitions.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  for (let i = 0; i < MAX_AGENT_ITERATIONS; i++) {
    const response = await anthropicRequest({
      model: MODEL,
      max_tokens: 4096,
      system: `${systemPrompt}\n\n${contextNote}`,
      tools,
      messages,
    });

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
      return extractText(response.content) || 'Listo.';
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: ContentBlock[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input ?? {});
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    return extractText(response.content) || 'No pude completar la solicitud.';
  }

  return 'Alcancé el límite de pasos del agente. Revisa si los cambios se aplicaron e intenta de nuevo.';
}
