import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = 6002;

// Supabase Admin Client
const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

app.use(cors());
app.use(bodyParser.json());

// --- User Management APIs ---

// 1. List Users
app.get('/api/admin/users', async (req, res) => {
    try {
        // Fetch users from auth.users via admin API
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        // Merge with profile data for roles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*');

        if (profileError) throw profileError;

        const combinedUsers = users.map(user => {
            const profile = profiles.find(p => p.id === user.id);
            return {
                id: user.id,
                email: user.email,
                last_login: user.last_sign_in_at,
                created_at: user.created_at,
                role: profile?.role || 'user',
                name: profile?.name || '',
                company: profile?.company || '',
                primary_platform: profile?.primary_platform || '',
                primary_category: profile?.primary_category || '',
                subscription_tier: profile?.subscription_tier || 'free',
                subscription_expires_at: profile?.subscription_expires_at || null
            };
        });

        res.json({ success: true, users: combinedUsers });
    } catch (error) {
        console.error("Fetch users failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 1.1 Update User Subscription
app.patch('/api/admin/users/:id/subscription', async (req, res) => {
    const { id } = req.params;
    const { tier, expires_at } = req.body;
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                subscription_tier: tier,
                subscription_expires_at: expires_at
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Subscription updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Reset Password
app.post('/api/admin/users/reset-password', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email
        });
        if (error) throw error;
        res.json({ success: true, message: 'Password reset link generated/sent.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Delete User
app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Existing APIs ---

// 1. AI Report Generation
app.post('/api/admin/reports/generate', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, 'report_generator', 'generate_daily_report.py');
        const cwd = __dirname;

        // Ensure virtual environment is activated before running the script
        const command = `source venv/bin/activate && python ${scriptPath}`;

        console.log("Triggering Daily Report Generation...");
        const { stdout, stderr } = await execAsync(command, { cwd, shell: '/bin/zsh' });

        console.log("Python stdout:", stdout);
        if (stderr) console.error("Python stderr:", stderr);

        res.json({ success: true, message: 'Report generated successfully.' });
    } catch (error) {
        console.error("Report generation failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. AI Report Download
app.get('/api/admin/reports/download', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'report_generator', 'output_daily_report.pdf');

        // Check if file exists
        await fs.access(filePath);

        // Get today's date for the filename
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Daily_Beauty_Insight_${dateStr}.pdf"`);

        const fileContent = await fs.readFile(filePath);
        res.send(fileContent);
    } catch (error) {
        console.error("Download failed:", error);
        res.status(404).json({ success: false, error: 'Report PDF not found. Generate it first.' });
    }
});

// 3. Crawler Logs API
app.get('/api/admin/logs', async (req, res) => {
    const type = req.query.type || 'ecommerce';
    let logPath = '';

    switch (type) {
        case 'ecommerce':
            logPath = path.join(__dirname, 'cron_ecommerce.log');
            break;
        case 'news':
            logPath = path.join(__dirname, 'cron_news.log');
            break;
        case 'aggregator':
            logPath = path.join(__dirname, 'cron_aggregator.log');
            break;
        default:
            logPath = path.join(__dirname, 'cron.log');
    }

    try {
        await fs.access(logPath);
        // Read last 100 lines or just read tail (simplified for now: last 50KB)
        const stats = await fs.stat(logPath);
        const start = Math.max(0, stats.size - 50000);
        const buffer = Buffer.alloc(stats.size - start);
        const fd = await fs.open(logPath, 'r');
        await fd.read(buffer, 0, buffer.length, start);
        await fd.close();

        res.json({ success: true, logs: buffer.toString('utf8') });
    } catch (error) {
        res.status(404).json({ success: false, error: 'Log file not found.' });
    }
});

// --- Sourcing (B2B) APIs ---

// 1. Submit Sourcing Request (User)
app.post('/api/sourcing/request', async (req, res) => {
    const { user_id, user_email, items, user_message } = req.body;
    try {
        // Insert into Supabase
        const { data, error } = await supabase
            .from('sourcing_requests')
            .insert([
                { user_id, user_email, items, user_message }
            ])
            .select();

        if (error) throw error;

        // Send Email Notification in background
        const scriptPath = path.join(__dirname, 'notify_sourcing.py');
        const count = Array.isArray(items) ? items.length : 0;
        // Escape arguments to prevent injection
        const cleanEmail = String(user_email).replace(/"/g, '\\"');
        const cleanMsg = String(user_message || '없음').replace(/"/g, '\\"');

        const command = `source venv/bin/activate && python "${scriptPath}" "${cleanEmail}" "${cleanMsg}" "${count}"`;
        exec(command, { cwd: __dirname, shell: '/bin/zsh' }, (err, stdout, stderr) => {
            if (err) console.error("Email notification failed:", err);
            else console.log("Email notification sent:", stdout);
        });

        res.json({ success: true, message: 'Request submitted successfully.', data: data[0] });
    } catch (error) {
        console.error("Sourcing request failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Get User's Sourcing History
app.get('/api/sourcing/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('sourcing_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, requests: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Get All Sourcing Requests (Admin)
app.get('/api/admin/sourcing', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sourcing_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, requests: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Delete Sourcing Request (Admin)
app.delete('/api/admin/sourcing/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('sourcing_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Request deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Update Sourcing Request (Admin)
// Notice the comments numerical increment
app.put('/api/admin/sourcing/:id', async (req, res) => {
    const { id } = req.params;
    const { status, estimated_cost, shipping_fee, service_fee, items, admin_reply } = req.body;
    try {
        // First get the user_id of this request
        const { data: reqData, error: reqErr } = await supabase
            .from('sourcing_requests')
            .select('user_id, status')
            .eq('id', id)
            .single();

        if (reqErr) throw reqErr;

        const updateData = {
            status,
            estimated_cost,
            admin_reply,
            updated_at: new Date().toISOString()
        };

        if (shipping_fee !== undefined) updateData.shipping_fee = shipping_fee;
        if (service_fee !== undefined) updateData.service_fee = service_fee;
        if (items !== undefined) updateData.items = items;

        const { error } = await supabase
            .from('sourcing_requests')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // Automatically trigger a notification to the user if it was quoted or completed
        if (status !== reqData.status && (status === 'quoted' || status === 'completed' || status === 'canceled')) {
            let msg = '';
            let title = '';
            if (status === 'quoted') {
                title = '📦 견적 도착 안내';
                msg = `요청하신 소싱 건에 대한 총 예상 견적(₩${(estimated_cost || 0).toLocaleString()})이 책정되었습니다.`;
            } else if (status === 'completed') {
                title = '✅ 발주/배송 환료';
                msg = `요청하신 소싱 건의 발주 및 배송 처리가 완료되었습니다.`;
            } else if (status === 'canceled') {
                title = '❌ 요청 취소 안내';
                msg = `요청하신 소싱 건이 취소되었습니다. 관리자 메시지를 확인해주세요.`;
            }

            // Insert Notification (fire and forget, don't throw if fails to not break quote save)
            supabase.from('user_notifications').insert({
                user_id: reqData.user_id,
                type: 'sourcing',
                title: title,
                message: msg,
                link: 'sourcing', // to click and open sourcing tab in mypage
                is_read: false
            }).then(({ error }) => {
                if (error) console.error("Notification insert error:", error);
            });
        }

        res.json({ success: true, message: 'Request updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Notifications Endpoint
// Get unread notifications for a user
app.get('/api/notifications', async (req, res) => {
    // We expect the frontend to pass the user ID as a query param or Authorization header
    // Since we don't have a middleware built-in here for JWT verification easily mapping to supabase session sync,
    // we'll accept user_id from query for simplicity, similar to how sourcing history does it.
    // In production, we'd verify the JWT.
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: 'User ID is required' });

    try {
        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', user_id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        res.json({ success: true, notifications: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- PayPal Integration ---
// Verify payment and update subscription
app.post('/api/paypal/capture', async (req, res) => {
    const body = req.body || {};
    const { subscriptionID, userId } = body;

    if (!subscriptionID || !userId) {
        return res.status(400).json({ success: false, error: 'Missing subscriptionID or userId' });
    }

    try {
        // 1. Get PayPal Access Token
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secret = process.env.PAYPAL_SECRET;

        // Determine if Sandbox or Live environment
        // Default to Sandbox, but switch to Live if process.env.PAYPAL_MODE is 'live'
        const environmentUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        if (!clientId || !secret) {
            throw new Error("PayPal API credentials are not configured on the server.");
        }

        const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
        const tokenResponse = await fetch(`${environmentUrl}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`PayPal auth failed: ${tokenData.error_description || tokenData.message}`);
        }

        const accessToken = tokenData.access_token;

        // 2. Fetch Subscription Details
        const captureResponse = await fetch(`${environmentUrl}/v1/billing/subscriptions/${subscriptionID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const captureData = await captureResponse.json();

        // Active status means the trial started successfully or payment went through.
        if (captureResponse.ok && captureData.status === 'ACTIVE') {
            // 3. Update User Subscription in Supabase
            // Use PayPal's next_billing_time to set the true expiration date
            let expiresAt = new Date();

            if (captureData.billing_info && captureData.billing_info.next_billing_time) {
                // Parse PayPal's ISO string (e.g. "2026-03-12T10:00:00Z")
                expiresAt = new Date(captureData.billing_info.next_billing_time);
            } else {
                // Fallback: 1 month Trial / Cycle
                expiresAt.setDate(expiresAt.getDate() + 30);
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    subscription_tier: 'pro',
                    subscription_id: subscriptionID, // Store the Sub ID for cancellations later
                    expires_at: expiresAt.toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                console.error("Failed to update user profile in Supabase after successful subscription:", updateError);
                throw new Error("Subscription verified, but failed to update user profile.");
            }

            res.json({ success: true, message: 'Subscription captured and profile updated.' });
        } else {
            console.error("PayPal subscription capture failed:", captureData);
            res.status(400).json({ success: false, error: 'Subscription not ACTIVE or failed.' });
        }
    } catch (error) {
        console.error("PayPal Capture Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel existing subscription
app.post('/api/paypal/cancel', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

    try {
        // 1. Get profile from Supabase to find subscription_id
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('subscription_id')
            .eq('id', userId)
            .single();

        if (profileErr || !profile || !profile.subscription_id) {
            return res.status(400).json({ success: false, error: 'No active subscription found for this user.' });
        }

        const subId = profile.subscription_id;

        // 2. Get PayPal Access Token
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secret = process.env.PAYPAL_SECRET;
        const environmentUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
        const tokenResponse = await fetch(`${environmentUrl}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) throw new Error("Failed to get PayPal token");
        const accessToken = tokenData.access_token;

        // 3. Cancel Subscription via PayPal API
        const cancelResponse = await fetch(`${environmentUrl}/v1/billing/subscriptions/${subId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ reason: "User requested cancellation via dashboard" })
        });

        // 204 No Content is success for cancellation
        if (cancelResponse.ok || cancelResponse.status === 204 || cancelResponse.status === 200) {
            // 4. Update Supabase: remove subscription_id so it doesn't auto-renew
            // But KEEP expires_at intact so they can use it for the remainder of the month!
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ subscription_id: null })
                .eq('id', userId);

            if (updateErr) throw updateErr;

            res.json({ success: true, message: 'Subscription cancelled. Pro access remains until the end of the current cycle.' });
        } else {
            const errData = await cancelResponse.json();
            throw new Error(`PayPal Cancel failed: ${errData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("PayPal Cancel Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Steady Sellers Management APIs ---
// 1. List Steady Sellers
app.get('/api/admin/steady-sellers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('steady_sellers')
            .select('*')
            .order('rank', { ascending: true });

        if (error) throw error;
        res.json({ success: true, steady_sellers: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Create Steady Seller
app.post('/api/admin/steady-sellers', async (req, res) => {
    try {
        const { product_name, brand, price, image_url, link, rank, is_active } = req.body;
        const { data, error } = await supabase
            .from('steady_sellers')
            .insert([{ product_name, brand, price, image_url, link, rank, is_active }])
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, steady_seller: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Update Steady Seller
app.put('/api/admin/steady-sellers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, brand, price, image_url, link, rank, is_active } = req.body;

        const { data, error } = await supabase
            .from('steady_sellers')
            .update({ product_name, brand, price, image_url, link, rank, is_active, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, steady_seller: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Delete Steady Seller
app.delete('/api/admin/steady-sellers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('steady_sellers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. AI Translate API
app.post('/api/admin/translate', async (req, res) => {
    const { text, target_lang = 'en' } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text is required' });

    try {
        const OLLAMA_URL = "http://localhost:11434/api/generate";
        // Check if user has a custom model in env, else use deepseek
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "deepseek-r1:8b";

        const prompt = `
Translate the following Korean text to ${target_lang === 'en' ? 'natural and professional English' : target_lang}. 
Maintain the original tone and meaning. ONLY provide the translated text without any explanation or meta-talk.
If there are <think> tags or reasoning, ignore them and only output the final translation.

Text to translate:
${text}
`;

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.3 }
            })
        });

        if (!response.ok) throw new Error('Ollama connection failed');

        const data = await response.json();
        let translatedText = data.response || '';

        // Clean up <think> tags if deepseek is used
        translatedText = translatedText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        res.json({ success: true, translatedText });
    } catch (error) {
        console.error("Translation failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Data Pool Admin Backend running on http://localhost:${PORT}`);
    });
}

export default app;
