import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = 6002;

// ─── Email Notification Helper ────────────────────────────────────────────────
async function sendSourcingEmailNotification(userEmail, messageBody, itemCount) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const toEmail = process.env.NOTIFICATION_EMAIL || smtpUser;

    if (!smtpUser || !smtpPassword) {
        console.warn('[Email] SMTP credentials not found in .env. Skipping email.');
        return;
    }

    // Debug log SMTP credentials (mask password)
    console.log('[Email] SMTP config:', {
        host: smtpServer,
        port: smtpPort,
        user: smtpUser,
        password: smtpPassword ? '****' : undefined
    });

    const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword }
    });

    const mailOptions = {
        from: `"K-Vant Sourcing" <${smtpUser}>`,
        to: toEmail,
        subject: `[K-Vant Sourcing] \uc0c8\ub85c\uc6b4 \uacac\uc801 \uc694\uccad (\uc694\uccad\uc790: ${userEmail})`,
        text: `\uc0c8\ub85c\uc6b4 B2B \uc18c\uc2f1 \uacac\uc801 \uc694\uccad\uc774 \uc811\uc218\ub418\uc5c8\uc2b5\ub2c8\ub2e4.\n\n\u25a0 \uc694\uccad\uc790: ${userEmail}\n\u25a0 \uc694\uccad \uc0c1\ud488 \uc885\ub958: ${itemCount}\uac1c\n\u25a0 \ucd94\uac00 \uba54\uc2dc\uc9c0: \n${messageBody}\n\nK-Vant \uc5b4\ub4dc\ubbfc \ud398\uc774\uc9c0 '\uc18c\uc2f1/\uacac\uc801 \uad00\ub9ac' \ud0ed\uc5d0\uc11c \ub0b4\uc5ed\uc744 \ud655\uc778\ud558\uace0 \uacac\uc801\uc744 \ud68c\uc2e0\ud574\uc8fc\uc138\uc694.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('[Email] \u2705 Sourcing notification email sent to', toEmail);
    } catch (e) {
        console.error('[Email] \u274c Failed to send email:', e.message);
    }
}

// ─── User Notification Email Helper ───────────────────────────────────────────
async function sendUserNotificationEmail(userEmail, title, messageBody) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpUser || !smtpPassword) {
        console.warn('[Email] SMTP credentials not found. Skipping user notification email.');
        return;
    }

    if (!userEmail) {
        console.warn('[Email] User email is empty. Skipping email.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword }
    });

    const mailOptions = {
        from: `"K-Vant" <${smtpUser}>`,
        to: userEmail,
        subject: `[K-Vant] ${title}`,
        html: `
            <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:30px 20px;">
                <div style="text-align:center;margin-bottom:30px;">
                    <h1 style="color:#0071e3;font-size:24px;margin:0;">K-Vant</h1>
                </div>
                <div style="background:#f5f5f7;border-radius:12px;padding:24px;margin-bottom:20px;">
                    <h2 style="color:#1d1d1f;font-size:18px;margin:0 0 12px 0;">${title}</h2>
                    <p style="color:#424245;font-size:14px;line-height:1.6;margin:0;">${messageBody}</p>
                </div>
                <div style="text-align:center;margin-top:24px;">
                    <a href="https://www.kvantlab.com" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">마이페이지에서 확인하기</a>
                </div>
                <p style="color:#86868b;font-size:11px;text-align:center;margin-top:30px;">본 메일은 K-Vant 서비스에서 자동 발송되었습니다.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('[Email] ✅ User notification email sent to', userEmail);
    } catch (e) {
        console.error('[Email] ❌ Failed to send user email:', e.message);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Custom Email OTP Store ──────────────────────────────────────────────────
const otpStore = new Map(); // email -> { code, expiresAt }

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function cleanExpiredOtps() {
    const now = Date.now();
    for (const [email, data] of otpStore) {
        if (data.expiresAt < now) otpStore.delete(email);
    }
}

async function sendOtpEmail(toEmail, code) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpUser || !smtpPassword) {
        throw new Error('SMTP credentials not configured');
    }

    const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword }
    });

    const mailOptions = {
        from: `"K-Vant" <${smtpUser}>`,
        to: toEmail,
        subject: `[K-Vant] 이메일 인증번호 / Email Verification Code`,
        html: `
            <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:500px;margin:0 auto;padding:30px 20px;">
                <div style="text-align:center;margin-bottom:30px;">
                    <h1 style="color:#0071e3;font-size:24px;margin:0;">K-Vant</h1>
                    <p style="color:#86868b;font-size:13px;margin-top:4px;">DataPool 회원가입 인증</p>
                </div>
                <div style="background:#f5f5f7;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
                    <p style="color:#1d1d1f;font-size:14px;margin:0 0 16px 0;">아래의 인증번호를 가입 화면에 입력해주세요.</p>
                    <div style="background:#fff;border-radius:12px;padding:20px;display:inline-block;margin:0 auto;">
                        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0071e3;">${code}</span>
                    </div>
                    <p style="color:#86868b;font-size:12px;margin-top:16px;">이 인증번호는 5분간 유효합니다.</p>
                </div>
                <p style="color:#86868b;font-size:11px;text-align:center;">본인이 요청하지 않은 경우 이 메일을 무시해주세요.<br/>This email was sent automatically from K-Vant.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[OTP] ✅ Verification code sent to ${toEmail}`);
}
// ─────────────────────────────────────────────────────────────────────────────


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

// --- Custom Email OTP Endpoints ---

// Send OTP via our SMTP (bypasses Supabase email rate limits)
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    try {
        cleanExpiredOtps();
        const code = generateOtp();
        otpStore.set(email.toLowerCase(), {
            code,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        });

        await sendOtpEmail(email, code);
        res.json({ success: true });
    } catch (error) {
        console.error('[OTP] Send error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verify OTP and create/get user
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    const stored = otpStore.get(email.toLowerCase());
    if (!stored) {
        return res.status(400).json({ success: false, error: '인증번호가 만료되었거나 요청되지 않았습니다. / OTP not found or expired.' });
    }
    if (stored.expiresAt < Date.now()) {
        otpStore.delete(email.toLowerCase());
        return res.status(400).json({ success: false, error: '인증번호가 만료되었습니다. 다시 발송해주세요. / OTP expired.' });
    }
    if (stored.code !== code) {
        return res.status(400).json({ success: false, error: '인증번호가 일치하지 않습니다. / Invalid OTP.' });
    }

    // OTP verified — clean up
    otpStore.delete(email.toLowerCase());

    try {
        // Check if user already exists in Supabase Auth
        const { data: { users } } = await supabase.auth.admin.listUsers();
        let user = users.find(u => u.email === email.toLowerCase());

        if (!user) {
            // Create a new user with a temporary password (will be updated during signup)
            const tempPassword = `TEMP_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: email.toLowerCase(),
                password: tempPassword,
                email_confirm: true
            });
            if (createError) throw createError;
            user = newUser.user;
        }

        // Generate a session token for this user
        const { data: sessionData, error: tokenError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email.toLowerCase()
        });

        // Since we can't directly get a session via admin, use signInWithPassword isn't possible
        // Instead, we'll return user info and a verified flag. The frontend will handle the session.
        res.json({
            success: true,
            verified: true,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('[OTP] Verify error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Complete signup: set password + update profile (called after OTP verification)
app.post('/api/auth/complete-signup', async (req, res) => {
    const { userId, email, password, name, company, primary_platform, primary_category } = req.body;

    if (!userId || !email || !password) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // Set the user's permanent password via admin API
        const { error: pwError } = await supabase.auth.admin.updateUserById(userId, {
            password: password
        });
        if (pwError) throw pwError;

        // Upsert profile data
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                name: name || '',
                company: company || '',
                primary_platform: primary_platform || '',
                primary_category: primary_category || '',
                subscription_tier: 'free',
                subscription_expires_at: null,
                daily_usage: 0,
                role: 'user'
            }, { onConflict: 'id' });

        if (profileError) {
            console.warn('[Signup] Profile update warning:', profileError.message);
        }

        // Sign the user in to get a valid session token
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (signInError) throw signInError;

        res.json({
            success: true,
            session: {
                access_token: signInData.session?.access_token,
                user: signInData.user
            }
        });

    } catch (error) {
        console.error('[Signup] Complete signup error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

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

// 3. Delete User (Admin)
app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Clean up related data first
        await supabase.from('sourcing_requests').delete().eq('user_id', id);
        await supabase.from('search_requests').delete().eq('user_id', id);
        await supabase.from('user_notifications').delete().eq('user_id', id);
        await supabase.from('wishlists').delete().eq('user_id', id);
        await supabase.from('profiles').delete().eq('id', id);

        // Delete from Supabase Auth
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Admin delete user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3.1 Self-delete User (called by the user themselves from My Page)
app.post('/api/user/delete', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

    try {
        // Cancel PayPal subscription if active
        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_id')
            .eq('id', userId)
            .single();

        if (profile?.subscription_id) {
            try {
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
                if (tokenResponse.ok) {
                    await fetch(`${environmentUrl}/v1/billing/subscriptions/${profile.subscription_id}/cancel`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${tokenData.access_token}`
                        },
                        body: JSON.stringify({ reason: 'User account deletion' })
                    });
                }
            } catch (ppErr) {
                console.warn('PayPal cancel during delete (non-fatal):', ppErr.message);
            }
        }

        // Clean up related data
        await supabase.from('sourcing_requests').delete().eq('user_id', userId);
        await supabase.from('search_requests').delete().eq('user_id', userId);
        await supabase.from('user_notifications').delete().eq('user_id', userId);
        await supabase.from('wishlists').delete().eq('user_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);

        // Delete from Supabase Auth
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;

        console.log(`User ${userId} fully deleted (self-delete).`);
        res.json({ success: true, message: 'Account deleted successfully.' });
    } catch (error) {
        console.error('Self-delete user error:', error);
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

        // Send Email Notification asynchronously (non-blocking)
        const count = Array.isArray(items) ? items.length : 0;
        sendSourcingEmailNotification(user_email, user_message || '없음', count);

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
            .select('user_id, user_email, status')
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

            // Send email notification to the user (fire and forget)
            if (reqData.user_email) {
                sendUserNotificationEmail(reqData.user_email, title, msg);
            }
        }

        res.json({ success: true, message: 'Request updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Product Search Request APIs ---

// 1. Submit a search request (User)
app.post('/api/search-request', async (req, res) => {
    const { user_id, user_email, sns_link, image_urls, note } = req.body;
    try {
        const { data, error } = await supabase
            .from('product_search_requests')
            .insert([{ user_id, user_email, sns_link, image_urls: image_urls || [], note }])
            .select();
        if (error) throw error;

        // Notify admin via dashboard notification (optional)
        supabase.from('user_notifications').insert({
            user_id: '00000000-0000-0000-0000-000000000000', // admin placeholder
            type: 'search_request',
            title: '🔍 새 상품 검색 요청',
            message: `${user_email || '사용자'}이 새로운 상품 검색을 요청했습니다.`,
            link: 'admin',
            is_read: false
        }).then(() => { });

        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('Search request failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Get user's search request history
app.get('/api/search-request/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('product_search_requests')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, requests: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Admin — Get all search requests
app.get('/api/admin/search-requests', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('product_search_requests')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, requests: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Admin — Update search request (status + admin reply)
app.put('/api/admin/search-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status, admin_reply } = req.body;
    try {
        const { data: reqData } = await supabase
            .from('product_search_requests')
            .select('user_id, user_email')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('product_search_requests')
            .update({ status, admin_reply, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;

        // Notify the user
        if (reqData?.user_id) {
            const title = status === 'found' ? '🎉 상품 검색 결과 안내' : '❌ 상품 검색 결과 안내';
            const msg = status === 'found'
                ? '요청하신 상품을 발견했습니다! 마이페이지에서 확인해주세요.'
                : '요청하신 상품을 찾지 못했습니다. 관리자 메시지를 확인해주세요.';
            supabase.from('user_notifications').insert({
                user_id: reqData.user_id, type: 'search_request',
                title, message: msg, link: 'sourcing', is_read: false
            }).then(() => { });

            // Send email notification to the user
            if (reqData.user_email) {
                sendUserNotificationEmail(reqData.user_email, title, msg);
            }
        }
        res.json({ success: true });
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
                    subscription_expires_at: expiresAt.toISOString()
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
