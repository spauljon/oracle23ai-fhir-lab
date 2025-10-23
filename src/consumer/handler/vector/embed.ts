import { OpenAI } from 'openai';

const openai =
  process.env.EMBEDDINGS_DISABLED || !process.env.OPENAI_API_KEY
    ? null
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const createEmbedding = async (text: string) => {
  if (openai) {
    const r = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return r.data[0].embedding;
  }

  console.warn('⚠️ Skipping embedding (disabled or no OPENAI_API_KEY)');

  return null;
};
