import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY secret" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
    const content = data?.choices?.[0]?.message?.content || "";

    let parsed: { title?: string; description?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Attempt to extract JSON substring
      const match = content.match(/\{[\s\S]*\}/);
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
