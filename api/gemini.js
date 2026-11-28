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
      systemInstruction = `You are Makeist1 AI, an elite web designer. Create a complete, single-file responsive HTML website using Tailwind CSS CDN (<script src="https://tailwindcss.com"></script>). Make it modern with hero section, features, and call-to-action. Return ONLY raw valid HTML starting with <!DOCTYPE html>. Do NOT wrap in markdown backticks.`;
    } else if (mode === "pro_build") {
      systemInstruction = `You are Makeist1 Senior Enterprise Architect. Build a MASSIVE, ultra-detailed, agency-grade single-file HTML website/e-commerce store using Tailwind CSS CDN (<script src="https://tailwindcss.com"></script>) and Google Fonts. Include: Sticky Navbar, Stunning Hero Section, Product/Service Grid with interactive Order/Cart Modal, Customer Reviews, FAQ Accordion, Floating WhatsApp/AI Support Widget, and Footer. Return ONLY raw valid HTML starting with <!DOCTYPE html>. Do NOT wrap in markdown backticks.`;
       } else if (mode === "build_agent") {
      systemInstruction = `You are Makeist1 AI Agent Architect. Create a standalone, plug-and-play floating AI Chat Widget snippet (HTML + CSS + Vanilla JS) trained strictly on the client's business details, products, prices, and rules provided in the prompt. It must work standalone on any website without external dependencies, feature a sleek floating chat button at bottom-right, answer customer queries naturally in Bengali & English based on the business knowledge, and collect customer order/contact info. Return ONLY raw valid HTML/JS snippet code without markdown backticks.`;
    } else if (mode === "edit_site") {
      systemInstruction = `You are Makeist1 AI Web Editor. Modify the provided HTML code according to the user's instructions while keeping the rest intact. Return ONLY updated raw valid HTML starting with <!DOCTYPE html>. Do NOT wrap in markdown backticks.`;
      userPrompt = `Current HTML:\n${currentHtml}\n\nRequested Changes:\n${prompt}`;
        } else if (mode === "agent_chat") {
      systemInstruction = `You are a smart, fast AI Agent created on Makeist1. Role: ${agentType || "Business Assistant"}. CRITICAL RULE: Detect the user's message language automatically. If the user writes in Bengali (বাংলা) or Banglish, ALWAYS reply in natural, polite Bengali (বাংলা). If in English, reply in English. Keep answers short, helpful, and under 3 sentences.`;
    } else if (mode === "custom_support") {
      systemInstruction = `You are the Makeist1 Project Consultant. Reply in the exact same language the user writes in (if Bengali or Banglish, reply strictly in natural Bengali). Keep responses concise and helpful.`;
    }

    const isChatMode = mode === "agent_chat" || mode === "custom_support";
    const genConfig = isChatMode
      ? { systemInstruction, temperature: 0.4, maxOutputTokens: 250 }
      : { systemInstruction, temperature: 0.7 };

    const fastModels = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3-flash-preview"];

    let response = null;
    try {
      response = await Promise.any(
        fastModels.map(async (modelName) => {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: genConfig,
          });
          if (!res || !res.text) throw new Error("Empty response");
          return res;
        })
      );
    } catch (raceErr) {
      const listResp = await ai.models.list();
      for await (const m of listResp) {
        const cleanName = (m.name || "").replace("models/", "");
        if (cleanName.includes("flash") && !cleanName.includes("2.5") && !cleanName.includes("2.0") && !cleanName.includes("1.5") && !cleanName.includes("embedding")) {
          try {
            response = await ai.models.generateContent({
              model: cleanName,
              contents: userPrompt,
              config: genConfig,
            });
            if (response && response.text) break;
          } catch (e) {}
        }
      }
    }


    if (!response || !response.text) {
      throw lastError || new Error("No available model responded.");
    }

    let output = response.text || "";
    output = output.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    output = output.replace(/https:\/\/tailwindcss\.com/g, "https://cdn.tailwindcss.com");
    return res.status(200).json({ result: output });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "AI generation failed" });
  }
}
  
