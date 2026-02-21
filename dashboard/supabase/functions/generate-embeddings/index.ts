import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { text, productId, persist = false } = await req.json();

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
        if (!text && !productId) throw new Error('Input text or productId is required');

        let inputText = text;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch product info if text is missing but productId is provided
        if (!inputText && productId) {
            const { data, error } = await supabase
                .from('products_master')
                .select('name, brand, tags')
                .eq('id', productId)
                .single();

            if (error || !data) throw new Error(`Product not found: ${error?.message}`);

            // Combine fields for a richer embedding
            inputText = `${data.brand || ''} ${data.name}. ${data.tags?.description || ''}`;
        }

        // Call Gemini Embedding API (text-embedding-004)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/text-embedding-004",
                    content: {
                        parts: [{ text: inputText }]
                    }
                }),
            }
        );

        const aiData = await response.json();
        if (!aiData.embedding?.values) {
            console.error("Gemini Error:", aiData);
            throw new Error('Invalid embedding response from Gemini');
        }

        const embedding = aiData.embedding.values;

        // Persist to DB if requested
        if (persist && productId) {
            const { error: updateError } = await supabase
                .from('products_master')
                .update({ embedding })
                .eq('id', productId);

            if (updateError) throw updateError;
        }

        return new Response(JSON.stringify({ embedding }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Embedding Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
