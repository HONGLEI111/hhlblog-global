interface Env {
  DEEPSEEK_API_KEY: string;
}

const ALLOWED_ORIGINS = [
  'https://www.hehonglei.cn',
  'https://hehonglei.cn',
  'http://localhost:4321',
  'http://122.51.73.208:4321',
];

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: isAllowed ? corsHeaders(origin) : {},
      });
    }

    if (!isAllowed) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let body: { messages: { role: string; content: string }[] };
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response('Missing messages array', { status: 400 });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个中文技术博客的 AI 助手。请用中文回答问题，保持简洁、有帮助。如果用户问你的身份，告诉他们你是这个博客的 AI 助手。',
          },
          ...body.messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response(`DeepSeek API error: ${response.status}`, {
        status: 502,
        headers: corsHeaders(origin),
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  },
};
