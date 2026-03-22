import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const SERVER_BASE_URL = "https://www.kvantlab.com";

function getSupabaseClient() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        throw new Error("Supabase credentials missing in process.env");
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

function getTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_SERVER || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
}

export async function extractAndSaveChannels(keyword, maxResults, llmFilter) {
    const supabase = getSupabaseClient();
    const YOUTUBE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!YOUTUBE_API_KEY || !GEMINI_API_KEY) throw new Error("API Keys missing in .env");

    let savedCount = 0;
    
    // 1. Search Channels
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=${maxResults}&q=${encodeURIComponent(keyword)}&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if(!searchData.items) return { count: 0, message: "No channels found." };

    // Set limit 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const defaultLlmFilter = "K-뷰티, 화장품, 혹은 한국 제품 관련";
    const filterRule = llmFilter || defaultLlmFilter;

    const promises = searchData.items.map(async (item) => {
        const channelId = item.snippet.channelId;
        const channelTitle = item.snippet.title;
        const channelDesc = item.snippet.description;

        // 2. Fetch Latest Videos
        const vidUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=4&channelId=${channelId}&key=${YOUTUBE_API_KEY}`;
        const vidRes = await fetch(vidUrl);
        const vidData = await vidRes.json();

        if (!vidData.items || vidData.items.length === 0) return; // Skip if no videos

        // Active Check
        const latestVideo = vidData.items[0];
        const publishedAt = new Date(latestVideo.snippet.publishedAt);
        if (publishedAt < threeMonthsAgo) return; // Inactive

        // 3. Prepare Text for Gemini
        let textBlock = `Channel Description: ${channelDesc}\n\n`;
        vidData.items.forEach((vid, i) => {
            textBlock += `Video ${i+1} Description: ${vid.snippet.description}\n\n`;
        });

        const prompt = `
당신은 정밀한 유튜브 채널 분석 및 리드 수집 AI입니다.
다음은 특정 유튜브 채널의 소개글 및 최근 영상 설명란 텍스트입니다.

--- 텍스트 데이터 ---
${textBlock}
---------------------

1. 먼저, 이 채널이 다음 기준에 부합하는지 판단하세요: [ ${filterRule} ]
2. 기준에 전혀 부합하지 않거나 쓸데없는 채널(예: 단순 게임, 도박, 불법, 무관한 주제 등)이라면, 즉시 "REJECTED" 하나만 출력하고 종료하세요.
3. 기준에 부합한다면, 텍스트 속에서 "비즈니스 문의용 이메일 주소"를 찾으세요.
4. 이메일을 찾았다면 오직 그 이메일 주소 문자열 하나만 출력하세요. (다른 설명 금지)
5. 기준엔 부합하지만 이메일이 없다면 "NOT_FOUND" 라고만 답변하세요.
`;

        // 4. Gemini Email Extraction & Filter
        try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const geminiData = await geminiRes.json();
            const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            
            if (!resultText || resultText === "NOT_FOUND" || resultText === "REJECTED" || !resultText.includes("@")) {
                console.log(`[YouTube] Skipped ${channelTitle}: ${resultText}`);
                return;
            }

            const email = resultText;
            const channelUrl = `https://www.youtube.com/channel/${channelId}`;

            // Save to DB
            const { error } = await supabase.from('youtube_campaigns').insert([{
                keyword,
                channel_name: channelTitle,
                channel_url: channelUrl,
                email,
                status: 'pending'
            }]);

            if (!error) {
                console.log(`[YouTube] Saved: ${channelTitle} (${email})`);
                savedCount++;
            } else {
                console.error(`[YouTube] DB Save Error for ${channelTitle}:`, error.message);
            }
        } catch (e) {
            console.error(`[YouTube] Gemini API Error for ${channelTitle}:`, e.message);
        }
    });

    await Promise.all(promises);
    return { count: savedCount, message: `Successfully extracted and saved ${savedCount} channels.` };
}

export async function sendEmailToChannel(leadId, emailSubject, emailBody) {
    const supabase = getSupabaseClient();
    const transporter = getTransporter();

    if (!process.env.SMTP_USER) throw new Error("SMTP credentials missing.");

    // Fetch lead details
    const { data: lead, error: fetchErr } = await supabase
        .from('youtube_campaigns')
        .select('*')
        .eq('id', leadId)
        .single();
        
    if (fetchErr || !lead) throw new Error("Lead not found: " + fetchErr?.message);
    if (lead.status === 'sent') throw new Error("이미 발송된 메일입니다.");

    let finalSubject = emailSubject || `Business Inquiry: Collaboration with {{channelName}} and K-Vant`;
    let finalBody = emailBody || `
    <p>Hi Team at {{channelName}},</p>
    <p>We've been following your channel and love your content! We believe there's a great synergy between your audience and the Korean brands we work with.</p>
    <p>Please let us know if you're open to discussing this further.</p>
    `;

    finalSubject = finalSubject.replace(/\{\{channelName\}\}/g, lead.channel_name);
    finalBody = finalBody.replace(/\{\{channelName\}\}/g, lead.channel_name);

    // Add tracking pixel
    const trackingPixel = `${SERVER_BASE_URL}/api/admin/youtube/track/${leadId}`;
    finalBody += `<br><img src="${trackingPixel}" width="1" height="1" style="display:none;" />`;

    const mailOptionsConfig = {
        from: `"K-Vant Team" <${process.env.SMTP_USER}>`,
        to: lead.email,
        subject: finalSubject,
        html: finalBody
    };

    try {
        await transporter.sendMail(mailOptionsConfig);
        
        // Update DB
        await supabase
            .from('youtube_campaigns')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', leadId);
            
        return { success: true };
    } catch (err) {
        console.error("Mail send error:", err);
        await supabase.from('youtube_campaigns').update({ status: 'failed' }).eq('id', leadId);
        throw err;
    }
}
