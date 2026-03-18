import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
  prompt: z.string().min(1),
  provider: z.enum(['claude', 'gemini']),
});

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?[\s\S]*?\n([\s\S]*?)```/);
  if (match) return match[1].trim();
  // fallback: strip any leading ```json or ``` line
  return text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parsed.error.issues }, { status: 400 });
  }

  const { prompt, provider } = parsed.data;
  let text: string;

  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }, { status: 400 });
    }
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = message.content[0];
      text = block.type === 'text' ? block.text : '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 500 });
    }
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 400 });
    }
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      text = result.response.text();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: `Gemini API error: ${message}` }, { status: 500 });
    }
  }

  const jsonText = extractJSON(text);
  let parsed_json: unknown;
  try {
    parsed_json = JSON.parse(jsonText);
  } catch {
    return NextResponse.json({ error: 'AI response did not contain valid JSON.', raw: text }, { status: 500 });
  }

  if (!Array.isArray(parsed_json)) {
    return NextResponse.json({ error: 'AI response JSON is not an array.', raw: text }, { status: 500 });
  }

  return NextResponse.json(parsed_json);
}
