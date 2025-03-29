const fs = require('fs');
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const universityText = fs.readFileSync('./data/ttpu_info.txt', 'utf-8');

async function askGPT(userQuestion) {
  const systemPrompt = `You are an AI assistant for Turin Polytechnic University in Tashkent (TTPU). If the users' questions are not clearly related to this university, tell them you can help with only this university. Answer questions based on this university information:\n\n${universityText}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion }
    ],
    temperature: 0.2
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { askGPT };