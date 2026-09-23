const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

const DEFAULT_AGENTROUTER_BASE = 'https://agentrouter.org/';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const DEFAULT_AGENTROUTER_KEY = 'sk-WaAwOhXqZkTdztEGO5EAOJifkCFIwY8WykvKoersm7mOAXNf';

function stripThinkingTags(text) {
  if (typeof text !== 'string') {
    return '';
  }
  // Remove closed <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Remove any unclosed <think>... blocks that might occur if max_tokens was reached
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  return cleaned.trim();
}

const SYSTEM_PROMPT = `You are the official Admission and Information AI Assistant for the University Of Liberal Arts Bangladesh (ULAB) Student Registration Portal.

Key Information:
1. Available Programs:
   - Computer Science & Engineering (CSE)
   - Software Engineering (SE)
   - Data Science & Artificial Intelligence (DSAI)
   - Electrical & Electronic Engineering (EEE)
   - Bachelor of Business Administration (BBA)
   - Media Studies & Journalism (MSJ)

2. Admission Eligibility & Requirements:
   - Minimum age: 16 years (calculated from date of birth).
   - Phone number: Must be an exact 11-digit number (e.g., 01712345678).
   - Email address: Must be unique and valid.
   - Address: Full address is required.

3. Admission Workflow:
   - New applications are registered with default status 'Submitted'.
   - Admissions officers review and update status to 'Approved' or 'Rejected'.
   - Once 'Approved' or 'Rejected', the decision is finalized and cannot be reverted.
   - Students receive a unique sequential Registration ID (e.g., REG1001).

4. Admin Access:
   - Evaluators and admissions staff log in via the Admin Portal (/admin-login.html).
   - Demo administrator credentials: username 'spetrum', password 'admin123'.

Guidelines:
- You are a helpful, versatile AI assistant representing ULAB.
- Answer all questions accurately, politely, and thoroughly.
- For ULAB admission, academic, and registration inquiries, prioritize the official facts above.
- For general questions (math, science, programming, general knowledge, greetings, casual conversation), provide direct, helpful, and friendly answers without refusing.
- Always provide the final direct answer immediately. Do not include internal monologue or chain-of-thought scratchpad notes.`;

async function callDeepSeekService(messages) {
  const apiBase = process.env.AGENTROUTER_API_BASE || DEFAULT_AGENTROUTER_BASE;
  const apiUrl = `${apiBase.replace(/\/+$/, '')}/v1/chat/completions`;
  const apiKey = process.env.AGENTROUTER_API_KEY || DEFAULT_AGENTROUTER_KEY;
  const modelToUse = process.env.AGENTROUTER_MODEL || DEFAULT_DEEPSEEK_MODEL;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'claude-cli/1.0.108 (external, cli)',
        'x-app': 'cli',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        max_tokens: 2048,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`AgentRouter API returned status ${response.status}:`, errorText);
      return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (content && typeof content === 'string' && content.trim().length > 0) {
      let reply = stripThinkingTags(content);
      if (!reply) reply = content.trim();
      return {
        reply,
        model: payload.model || modelToUse,
        provider: 'deepseek'
      };
    }

    return null;
  } catch (error) {
    console.warn('AgentRouter DeepSeek API exception:', error.message);
    return null;
  }
}

async function callGroqService(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const preferredModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const candidateModels = [preferredModel, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  const uniqueModels = [...new Set(candidateModels)];

  for (const modelToTry of uniqueModels) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelToTry,
          messages,
          max_tokens: 1200,
          temperature: 0.4
        })
      });

      if (!response.ok) {
        console.warn(`Groq model '${modelToTry}' failed with status ${response.status}.`);
        continue;
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim().length > 0) {
        let reply = stripThinkingTags(content);
        if (!reply) reply = content.trim();
        return {
          reply,
          model: payload.model || modelToTry,
          provider: 'groq'
        };
      }
    } catch (error) {
      console.warn(`Groq request error for '${modelToTry}':`, error.message);
    }
  }

  return null;
}

exports.chatWithAi = async (req, res) => {
  const { message, history = [], provider = 'deepseek' } = req.body;
  const selectedProvider = (provider || 'deepseek').toLowerCase();

  if (typeof fetch !== 'function') {
    return res.status(500).json({
      success: false,
      message: 'Server runtime does not support fetch. Please use Node.js 18+.'
    });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message cannot be empty.'
    });
  }

  const sanitizedHistory = Array.isArray(history)
    ? history
        .filter((item) => item && typeof item.content === 'string' && item.content.trim().length > 0)
        .map((item) => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content.trim()
        }))
    : [];

  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    ...sanitizedHistory,
    {
      role: 'user',
      content: message.trim()
    }
  ];

  let result = null;

  if (selectedProvider === 'deepseek' || selectedProvider === 'deepseek-v4-flash') {
    // Primary: DeepSeek (AgentRouter)
    result = await callDeepSeekService(messages);

    // Resilient Fallback: If DeepSeek was blocked or unavailable, seamlessly answer with Groq
    if (!result) {
      console.log('[AI Fallback] DeepSeek unavailable or blocked. Seamlessly falling back to Groq...');
      result = await callGroqService(messages);
    }
  } else {
    // Primary: Groq Cloud LLM
    result = await callGroqService(messages);

    // Resilient Fallback: If Groq was unavailable, fallback to DeepSeek
    if (!result) {
      console.log('[AI Fallback] Groq unavailable. Seamlessly falling back to DeepSeek...');
      result = await callDeepSeekService(messages);
    }
  }

  if (!result || !result.reply) {
    return res.status(502).json({
      success: false,
      message: 'AI assistant is currently experiencing high demand. Please retry your question.'
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      reply: result.reply,
      model: result.model,
      provider: result.provider
    }
  });
};

