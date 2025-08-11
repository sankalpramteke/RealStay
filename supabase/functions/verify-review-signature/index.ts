// Supabase Edge Function: verify-review-signature
// Verifies that a given signature corresponds to the provided wallet address for the canonical review message.
// Expected payload (JSON):
// {
//   message: { type: 'realstay.review.v1', user_id: string, hotel_id: string, rating: number, comment: string },
//   signature: string,
//   wallet_address: string
// }
// Returns: { valid: boolean, recoveredAddress?: string, error?: string }

// @ts-ignore deno runtime provides these modules; IDE may not resolve types locally
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore use esm.sh bundle for Deno; IDE may flag types but runtime is fine
import { recoverMessageAddress } from "https://esm.sh/viem@2.12.0?target=deno&bundle";

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  return new Response(res.body, { status: res.status, headers });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return cors(new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 }));
  }

  try {
    const body = await req.json();
    const { message, signature, wallet_address } = body ?? {};

    if (!message || !signature || !wallet_address) {
      return cors(new Response(JSON.stringify({ error: "Missing fields: message, signature, wallet_address required" }), { status: 400 }));
    }

    // Reconstruct canonical message object with the exact key order used client-side
    const canonical = {
      type: "realstay.review.v1",
      user_id: message.user_id,
      hotel_id: message.hotel_id,
      rating: message.rating,
      comment: message.comment,
    };

    const messageString = JSON.stringify(canonical);

    let recovered: string | undefined;
    try {
      recovered = await recoverMessageAddress({ message: messageString, signature });
    } catch (_) {
      // Some wallets display with a trailing newline; retry once with newline
      try {
        recovered = await recoverMessageAddress({ message: messageString + '\n', signature });
      } catch (e2) {
        return cors(new Response(JSON.stringify({ valid: false, error: `Recover failed: ${e2?.message ?? e2}` }), { status: 200 }));
      }
    }

    const valid = recovered?.toLowerCase() === String(wallet_address).toLowerCase();
    return cors(new Response(JSON.stringify({ valid, recoveredAddress: recovered }), { status: 200 }));
  } catch (e) {
    return cors(new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500 }));
  }
});
