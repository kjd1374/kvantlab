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
        const { productId, productName, reviews: inputReviews, persist = false } = await req.json();

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let reviews = inputReviews;
        let pName = productName;

        // Fetch data if only productId is provided
        if (productId && (!pName || !reviews)) {
            const { data: product, error: pError } = await supabase
                .from('products_master')
                .select('name, tags')
                .eq('id', productId)
                .single();

            if (pError || !product) throw new Error(`Product not found: ${pError?.message}`);
            pName = product.name;
            // Assuming reviews are stored in tags or need to be fetched separately.
            // For now, if reviews aren't passed, we try to use cached ones or tags if they exist.
            reviews = reviews || (product.tags?.reviews || []);
        }

        if (!pName || !reviews || reviews.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Missing productName or reviews' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const prompt = `
            Analyze the following reviews for the product "${pName}".
            Provide a summary in JSON format with exactly these fields:
            {
              "sentiment_pos": (integer 0-100),
              "keywords": ["word1", "word2", ...],
              "pros": ["pro1", "pro2", "pro3"],
              "cons": ["con1", "con2", "con3"]
            }
            Do not include any markdown or extra text.
            
            Reviews:
            ${reviews.join('\n').substring(0, 5000)}
        `;

        const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" }
                }),
            }
        );

        const aiData = await aiResponse.json();
        if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid AI response');
        }

        const result = JSON.parse(aiData.candidates[0].content.parts[0].text);

        // Persist to DB if requested or if we have a productId
        if (persist && productId) {
            await supabase
                .from('products_master')
                .update({ ai_summary: result })
                .eq('id', productId);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
