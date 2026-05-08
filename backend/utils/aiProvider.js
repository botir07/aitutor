/**
 * OpenAI-compatible chat/completions: Groq (primary, fast & affordable) or OpenAI.
 * Groq: https://console.groq.com/keys + GROQ_API_KEY
 */
function resolveOpenAICompatConfig() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && String(groqKey).trim() && groqKey !== 'your_groq_api_key_here') {
    return {
      key: String(groqKey).trim(),
      base: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
      model: (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
      provider: 'groq'
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && String(openaiKey).trim() && openaiKey !== 'your_openai_api_key_here') {
    return {
      key: String(openaiKey).trim(),
      base: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
      provider: 'openai'
    };
  }

  return {
    key: '',
    base: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    provider: 'none'
  };
}

module.exports = { resolveOpenAICompatConfig };
