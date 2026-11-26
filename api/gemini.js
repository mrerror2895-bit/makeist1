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
      const langNote = language === "bn" ? "Reply strictly in natural, polite Bengali." : "Reply in professional English.";
      systemInstruction = `You are a smart AI Agent created on Makeist1. Role: ${agentType || "Business Assistant"}. ${langNote} Keep responses helpful and concise.`;
    } else if (mode === "custom_support") {
      const langNote = language === "bn" ? "Reply in polite Bengali." : "Reply in helpful English.";
      systemInstruction = `You are the Makeist1 Project Consultant. A client is requesting a custom website or AI agent. Ask clarifying questions about their business, features, and budget. ${langNote} Keep it to 2-3 sentences.`;
    }

    let modelsToTry = ["gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.8-pro"];
    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: { systemInstruction, temperature: 0.7 },
        });
        if (response && response.text) break;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!response || !response.text) {
      const listResp = await ai.models.list();
      for await (const m of listResp) {
        const cleanName = (m.name || "").replace("models/", "");
        if (cleanName.includes("gemini") && !cleanName.includes("embedding") && !modelsToTry.includes(cleanName)) {
          try {
            response = await ai.models.generateContent({
              model: cleanName,
              contents: userPrompt,
              config: { systemInstruction, temperature: 0.7 },
            });
            if (response && response.text) break;
          } catch (e) {
            lastError = e;
          }
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
  
