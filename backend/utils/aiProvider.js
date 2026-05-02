/**
 * OpenAI-compatible chat/completions: Groq (priority) yoki OpenAI.
 * Groq: https://api.groq.com/openai/v1 + GROQ_API_KEY
 */
function resolveOpenAICompatConfig() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && String(groqKey).trim()) {
    return {
      key: String(groqKey).trim(),
      base: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
      model: (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
      provider: 'groq'
    };
  }

  const key = process.env.OPENAI_API_KEY;
  return {
    key: key ? String(key).trim() : '',
    base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    provider: 'openai'
  };
}

module.exports = { resolveOpenAICompatConfig };
