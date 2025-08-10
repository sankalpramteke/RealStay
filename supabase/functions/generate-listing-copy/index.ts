import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, propertyType, roomType, address, guests, bedrooms, beds, bathrooms, amenities, photos } = await req.json();

    const prompt = `Act as an expert hospitality copywriter. Create concise, appealing listing copy.
Return strict JSON with keys: title, description.
Constraints: title 50-60 chars max, description 300-500 chars.

Context:
- Category: ${category}
- Property type: ${propertyType}
- Room type: ${roomType}
- Address: ${address}
- Capacity: ${guests} guests, ${bedrooms} bedrooms, ${beds} beds, ${bathrooms} bathrooms
- Amenities: ${(amenities || []).join(", ")}
- Photo cues available: ${Array.isArray(photos) ? photos.length : 0}

Style: Friendly, clear, highlight what is unique, avoid clichés.
Output example: {"title":"…","description":"…"}`;

    // Prefer Gemini if available, otherwise fall back to OpenAI
    let content = "";

    if (GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
        }),
      });
      const data = await geminiRes.json();
      content = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    } else if (OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant that outputs strict JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      const data = await response.json();
      content = data?.choices?.[0]?.message?.content || "";
    } else {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY or OPENAI_API_KEY secret" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let parsed: { title?: string; description?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    return new Response(JSON.stringify({
      title: parsed.title || "",
      description: parsed.description || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in generate-listing-copy:", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
