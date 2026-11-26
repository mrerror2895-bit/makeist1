
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on server." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { mode, prompt, currentHtml, agentType, language } = req.body;

    let systemInstruction = "";
    let userPrompt = prompt || "";

    if (mode === "generate_site") {
      systemInstruction = `You are Makeist1 AI, an elite international web designer and developer. 
      Create a complete, stunning, single-file responsive HTML website using Tailwind CSS CDN (<script src="https://tailwindcss.com"></script>) and Google Fonts. 
      Make it look ultra-professional, modern, with smooth layouts, hero section, features, and call-to-action.
      Return ONLY raw valid HTML code starting with <!DOCTYPE html>. Do NOT wrap in markdown backticks (\`\`\`html). Do NOT include any explanation text.`;
    } else if (mode === "edit_site") {
      systemInstruction = `You are Makeist1 AI Web Editor. Modify the provided HTML code according to the user's instructions while keeping the rest of the design intact and professional.
      Return ONLY the updated raw valid HTML code starting with <!DOCTYPE html>. Do NOT wrap in markdown backticks. Do NOT add explanations.`;
      userPrompt = `Current HTML:\n${currentHtml}\n\nUser Requested Changes:\n${prompt}`;
    } else if (mode === "agent_chat") {
      const langNote = language === "bn" ? "Reply strictly in natural, polite Bengali." : "Reply in professional English.";
      systemInstruction = `You are a smart AI Agent created on the Makeist1 platform. Role: ${agentType || "Business Assistant"}. ${langNote} Keep responses helpful, concise, and conversion-focused.`;
    } else if (mode === "custom_support") {
      const langNote = language === "bn" ? "Reply in polite, helpful Bengali." : "Reply in helpful English.";
      systemInstruction = `You are the Makeist1 Platform Project Consultant. A client is requesting a custom website or AI agent package. Ask clarifying questions about their business, features, and budget, and assure them that the Makeist1 Expert Team + AI can build it quickly. ${langNote} Keep it short (2-3 sentences).`;
    }

    const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
      
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    let output = response.text || "";
    output = output.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    return res.status(200).json({ result: output });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "AI generation failed" });
  }
}
