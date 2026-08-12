// Service utility for interacting with Puter.js Free Unlimited AI API Models

export const PUTER_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', badge: 'Fast & Smart (Default)', icon: '⚡' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', badge: 'High Intelligence', icon: '🧠' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Deep Analysis', icon: '🎭' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', badge: 'High Logic', icon: '🧬' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', badge: 'Open Weights', icon: '🦙' }
];

export async function ensurePuterLoaded() {
  if (window.puter && window.puter.ai) {
    return window.puter;
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="puter.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.puter));
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => {
      if (window.puter && window.puter.ai) {
        resolve(window.puter);
      } else {
        reject(new Error('Puter SDK loaded but window.puter.ai is undefined.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Puter.js SDK script from CDN.'));
    document.head.appendChild(script);
  });
}

/**
 * Sends a message to Puter.js AI with prompt formatting and optional streaming support.
 */
export async function chatWithPuter({
  userQuery,
  systemContext = '',
  chatHistory = [],
  model = 'gpt-4o-mini',
  collegesContext = [],
  profileContext = null,
  onChunk = null
}) {
  const puter = await ensurePuterLoaded();

  let contextPrompt = `System Role: You are an expert, empathetic, highly knowledgeable Indian College Admission Counselor AI powered by Puter.js free AI models.\n\n`;

  if (profileContext) {
    contextPrompt += `Student Profile:\n`;
    if (profileContext.full_name) contextPrompt += `- Name: ${profileContext.full_name}\n`;
    if (profileContext.percentage_10th) contextPrompt += `- 10th Marks: ${profileContext.percentage_10th}%\n`;
    if (profileContext.percentage_12th) contextPrompt += `- 12th Marks: ${profileContext.percentage_12th}%\n`;
    if (profileContext.stream) contextPrompt += `- Stream: ${profileContext.stream}\n`;
    if (profileContext.exam_name) contextPrompt += `- Entrance Exam: ${profileContext.exam_name} (Score: ${profileContext.exam_score || 'N/A'}, Rank: ${profileContext.rank || 'N/A'})\n`;
    if (profileContext.preferred_course) contextPrompt += `- Preferred Course: ${profileContext.preferred_course}\n`;
    if (profileContext.preferred_state || profileContext.preferred_city) contextPrompt += `- Preferred Location: ${profileContext.preferred_city || profileContext.preferred_state}\n`;
    if (profileContext.max_budget) contextPrompt += `- Max Budget: ₹${profileContext.max_budget} Lakhs\n`;
    contextPrompt += `\n`;
  }

  if (collegesContext && collegesContext.length > 0) {
    contextPrompt += `Verified College & TNEA Cutoff Data (From Datasets CSV/JSON Database):\n`;
    collegesContext.forEach((c, idx) => {
      contextPrompt += `${idx + 1}. ${c.name} (${c.city || c.district}, ${c.state || 'Tamil Nadu'})\n`;
      if (c.code || c.college_code) contextPrompt += `   - College Code: ${c.code || c.college_code}\n`;
      if (c.total_estimated_fee || c.tuition_fee) contextPrompt += `   - Fee: ₹${c.total_estimated_fee || c.tuition_fee} Lakhs\n`;
      if (c.average_package) contextPrompt += `   - Avg Package: ₹${c.average_package} LPA\n`;
      
      if (c.cutoffs && c.cutoffs.length > 0) {
        contextPrompt += `   - Verified Cutoff Marks (From Datasets):\n`;
        c.cutoffs.forEach(ct => {
          contextPrompt += `     * ${ct.year || 2025} ${ct.category} (${ct.course || 'Branch'}): ${ct.cutoff_score} / 200\n`;
        });
      } else if (c.oc || c.bc || c.mbc || c.sc) {
        contextPrompt += `   - Verified Cutoff Marks (2025): OC=${c.oc || 'N/A'}, BC=${c.bc || 'N/A'}, MBC=${c.mbc || 'N/A'}, SC=${c.sc || 'N/A'}, ST=${c.st || 'N/A'}\n`;
      }
    });
    contextPrompt += `\n`;
  }

  if (systemContext) {
    contextPrompt += `Additional Context: ${systemContext}\n\n`;
  }

  contextPrompt += `STRICT RULES & INSTRUCTIONS FOR PUTER AI:\n`;
  contextPrompt += `1. MARKS & CUTOFFS INTEGRITY: Use ONLY the official cutoffs and marks retrieved from the Datasets CSV/JSON database provided above. Do NOT fabricate or alter factual cutoff numbers.\n`;
  contextPrompt += `2. LOCATION, REVIEWS & AI INSIGHTS: Use your full Puter AI capabilities to provide rich, realistic location context (city environment, connectivity, nearby hubs), student/user reviews & campus sentiment, pros & cons, and customized admission strategies.\n`;
  contextPrompt += `3. FORMATTING: Output cleanly formatted GitHub Markdown using clear section titles, bold text, bullet points, and status badges (🟢 Safe, 🟡 Target, 🔴 Dream, 📍 Location, 💬 Student Reviews, 💡 AI Insights).\n\n`;

  // Append recent chat history
  if (chatHistory && chatHistory.length > 0) {
    contextPrompt += `Recent Conversation History:\n`;
    chatHistory.slice(-6).forEach(msg => {
      const senderName = msg.sender === 'student' || msg.sender === 'user' ? 'Student' : 'Counselor AI';
      contextPrompt += `${senderName}: ${msg.message}\n`;
    });
    contextPrompt += `\n`;
  }

  contextPrompt += `Current Student Query: "${userQuery}"\n`;
  contextPrompt += `Response:`;

  try {
    // Attempt streaming with Puter.js
    if (typeof onChunk === 'function') {
      try {
        const stream = await puter.ai.chat(contextPrompt, { model, stream: true });
        let accumulated = '';
        for await (const chunk of stream) {
          const textChunk = chunk?.text || (typeof chunk === 'string' ? chunk : '');
          if (textChunk) {
            accumulated += textChunk;
            onChunk(accumulated, textChunk);
          }
        }
        if (accumulated.trim().length > 0) {
          return accumulated;
        }
      } catch (streamErr) {
        console.warn('Puter streaming error, falling back to non-streaming:', streamErr);
      }
    }

    // Non-streaming call
    const res = await puter.ai.chat(contextPrompt, { model });
    const textOutput = typeof res === 'string' ? res : (res?.message?.content || res?.text || String(res));
    return textOutput;
  } catch (err) {
    console.error('Puter AI API call failed:', err);
    throw err;
  }
}
