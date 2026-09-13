const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';

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
- Provide clear, direct, and welcoming responses.
- Keep answers concise, factual, and informative.
- Do not output any hidden reasoning, planning, or chain-of-thought tags.`;

exports.chatWithAi = async (req, res) => {
  const { message, history = [] } = req.body;
  const apiKey = process.env.GROQ_API_KEY;
  const preferredModel = process.env.GROQ_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: GROQ_API_KEY is missing.'
    });
  }

  if (typeof fetch !== 'function') {
    return res.status(500).json({
      success: false,
      message: 'Server runtime does not support fetch. Please use Node.js 18+.'
    });
  }

  const messages = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    },
    ...history.map((item) => ({
      role: item.role,
      content: item.content.trim()
    })),
    {
      role: 'user',
      content: message.trim()
    }
  ];

  // Helper to attempt completion with a given model
  async function callGroq(modelToUse) {
    return await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        max_tokens: 500,
        temperature: 0.4
      })
    });
  }

  let response;
  let activeModel = preferredModel;

  try {
    response = await callGroq(activeModel);

    // If preferred model is not found or rate-limited, fallback to DEFAULT_MODEL
    if (!response.ok && activeModel !== DEFAULT_MODEL) {
      console.warn(`Model '${activeModel}' failed with status ${response.status}. Retrying with fallback '${DEFAULT_MODEL}'...`);
      activeModel = DEFAULT_MODEL;
      response = await callGroq(activeModel);
    }
  } catch (error) {
    console.error('Groq API network error:', error);
    return res.status(502).json({
      success: false,
      message: 'Failed to reach Groq API.'
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API rejected request:', errorText);
    return res.status(502).json({
      success: false,
      message: 'Groq API returned an error.',
      details: errorText
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    console.error('Failed to parse Groq API response:', error);
    return res.status(502).json({
      success: false,
      message: 'Invalid response format from Groq API.'
    });
  }

  const rawReply = payload && payload.choices && payload.choices[0] && payload.choices[0].message
    ? payload.choices[0].message.content
    : null;

  if (!rawReply) {
    return res.status(502).json({
      success: false,
      message: 'Groq API returned an empty response.'
    });
  }

  let reply = stripThinkingTags(rawReply);
  if (!reply) {
    reply = rawReply.trim();
  }

  return res.status(200).json({
    success: true,
    data: {
      reply,
      model: payload.model || activeModel
    }
  });
};
