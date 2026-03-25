import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

import { createClient } from '@supabase/supabase-js';
import { extractAndSaveChannels, sendEmailToChannel } from './youtubeService.js';

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

// --- Telegram Notification Helper ---
async function sendTelegramNotification(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message })
        });
        console.log('[Telegram] ✅ Notification sent');
    } catch (error) {
        console.error('[Telegram] ❌ Failed to send:', error.message);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Custom Email OTP Helpers ─────────────────────────────────────────────────
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
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
        subject: `[K-Vant] Please verify your email address`,
        html: `
            <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:500px;margin:0 auto;padding:30px 20px;">
                <div style="text-align:center;margin-bottom:30px;">
                    <h1 style="color:#0071e3;font-size:24px;margin:0;">K-Vant</h1>
                </div>
                <div style="background:#f5f5f7;border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
                    <h2 style="color:#1d1d1f;font-size:18px;font-weight:700;margin:0 0 8px 0;">Welcome to K-Vant!</h2>
                    <p style="color:#1d1d1f;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Thank you for signing up. To complete your registration and secure your account, please enter the verification code below on the sign-up page:</p>
                    <div style="background:#fff;border-radius:12px;padding:20px;display:inline-block;margin:0 auto;">
                        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0071e3;">${code}</span>
                    </div>
                    <p style="color:#86868b;font-size:12px;margin-top:16px;">This code is valid for the next 5 minutes.</p>
                </div>
                <p style="color:#86868b;font-size:12px;text-align:center;line-height:1.6;">If you did not request this code, please ignore this email.<br/><br/>Best regards,<br/>The K-Vant Team</p>
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
// OTP stored in Supabase DB for persistence across serverless invocations
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    try {
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

        // Upsert OTP into DB (replace if same email already has one)
        const { error: dbError } = await supabase
            .from('email_otp')
            .upsert({ email: email.toLowerCase(), code, expires_at: expiresAt }, { onConflict: 'email' });
        if (dbError) {
            console.error('[OTP] DB upsert error:', dbError.message);
            throw new Error('Failed to store OTP');
        }

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

    try {
        // Read OTP from DB
        const { data: stored, error: readError } = await supabase
            .from('email_otp')
            .select('code, expires_at')
            .eq('email', email.toLowerCase())
            .single();

        if (readError || !stored) {
            return res.status(400).json({ success: false, error: '인증번호가 만료되었거나 요청되지 않았습니다. / OTP not found or expired.' });
        }
        if (new Date(stored.expires_at) < new Date()) {
            // Clean up expired OTP
            await supabase.from('email_otp').delete().eq('email', email.toLowerCase());
            return res.status(400).json({ success: false, error: '인증번호가 만료되었습니다. 다시 발송해주세요. / OTP expired.' });
        }
        if (stored.code !== code) {
            return res.status(400).json({ success: false, error: '인증번호가 일치하지 않습니다. / Invalid OTP.' });
        }

        // OTP verified — clean up from DB
        await supabase.from('email_otp').delete().eq('email', email.toLowerCase());

        // Check if user already exists in Supabase Auth
        let user = null;

        // Try to find existing user by email (more reliable than listUsers which has pagination)
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        user = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;

        if (!user) {
            // Create a new user with a temporary password (will be updated during signup)
            const tempPassword = `TEMP_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            try {
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: email.toLowerCase(),
                    password: tempPassword,
                    email_confirm: true
                });
                if (createError) {
                    // If user already exists (race condition), try to find again
                    if (createError.message?.includes('already') || createError.message?.includes('exists') || createError.message?.includes('duplicate')) {
                        console.log('[OTP] User already exists, fetching...');
                        const { data: retryUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
                        user = retryUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                        if (!user) throw new Error('User exists but cannot be found');
                    } else {
                        throw createError;
                    }
                } else {
                    user = newUser.user;
                }
            } catch (createErr) {
                console.error('[OTP] Create user error:', createErr);
                throw new Error('사용자 생성 오류: ' + (createErr.message || createErr));
            }
        }

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

        // Check if this email had a previous trial (trial abuse prevention)
        const { data: deletedRecord } = await supabase
            .from('deleted_accounts')
            .select('had_trial')
            .eq('email', email.toLowerCase())
            .eq('had_trial', true)
            .limit(1)
            .maybeSingle();

        const hadPreviousTrial = !!deletedRecord;

        // Upsert profile data — 2-week Pro trial for new signups (skip if had previous trial)
        const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                name: name || '',
                company: company || '',
                primary_platform: primary_platform || '',
                primary_category: primary_category || '',
                subscription_tier: hadPreviousTrial ? 'free' : 'pro',
                subscription_expires_at: hadPreviousTrial ? null : trialExpiresAt,
                daily_usage: 0,
                role: 'user'
            }, { onConflict: 'id' });

        if (profileError) {
            console.warn('[Signup] Profile update warning:', profileError.message);
        }

        // Insert welcome notifications (fire and forget)
        const notifications = [
            {
                user_id: userId,
                type: 'system',
                title: '🎉 K-Vant에 오신 것을 환영합니다!',
                message: `${name || '회원'}님, 가입을 축하합니다! K-Vant Intelligence에서 트렌드 분석과 소싱 도구를 활용해보세요.`,
                link: null,
                is_read: false
            }
        ];

        if (!hadPreviousTrial) {
            const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR');
            notifications.push({
                user_id: userId,
                type: 'system',
                title: '🎁 2주간 Pro 플랜 무료 체험!',
                message: `가입 축하 혜택으로 ${trialEndDate}까지 Pro 플랜이 무료 적용됩니다. 모든 프리미엄 기능을 자유롭게 이용해보세요!`,
                link: 'billing',
                is_read: false
            });
        } else {
            notifications.push({
                user_id: userId,
                type: 'system',
                title: '📋 무료 플랜으로 가입되었습니다',
                message: '이전에 Pro 체험을 이용하셨기 때문에 무료 플랜으로 시작합니다. 구독 갱신으로 Pro 플랜을 이용하실 수 있습니다.',
                link: 'billing',
                is_read: false
            });
        }

        supabase.from('user_notifications').insert(notifications).then(({ error }) => {
            if (error) console.error('[Signup] Welcome notification error:', error.message);
        });

        // 텔레그램 알림 전송 API
        await sendTelegramNotification(`🎉 [회원가입] 새로운 유저가 가입했습니다!\n\n이메일: ${email}\n이름: ${fullName || '미입력'}\n회사명: ${companyName || '미입력'}`);

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
        // Fetch user email and profile before deletion (for deleted_accounts record)
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(id);
        const { data: profile } = await supabase.from('profiles').select('subscription_tier, subscription_expires_at, created_at').eq('id', id).single();

        // Record in deleted_accounts for trial abuse prevention
        if (authUser?.email) {
            const hadTrial = profile?.subscription_tier === 'pro';
            await supabase.from('deleted_accounts').insert({
                email: authUser.email.toLowerCase(),
                had_trial: hadTrial,
                subscription_tier: profile?.subscription_tier || 'free',
                original_created_at: profile?.created_at || null
            });
        }

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

// 3.01 Promote to Partner (Admin)
app.post('/api/admin/users/:id/promote-partner', async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        const { data: existing } = await supabase.from('affiliate_partners').select('id').eq('user_id', id).single();
        if (existing) return res.json({ success: true, message: 'Already a partner' });

        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const refCode = `KVP${randomStr}`;

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', id).single();
        const partnerName = profile?.full_name || email?.split('@')[0] || 'Unknown';

        const { data: newPartner, error: insertErr } = await supabase.from('affiliate_partners').insert({
            user_id: id,
            ref_code: refCode,
            name: partnerName,
            email: email,
            commission_rate: 20
        }).select('id').single();

        if (insertErr) throw insertErr;

        await supabase.from('partner_stats').insert({
            partner_id: newPartner.id,
            total_signups: 0, active_trials: 0, paid_conversions: 0, total_earnings: 0, available_payout: 0
        });

        res.json({ success: true, ref_code: refCode });
    } catch (e) {
        console.error('Promote partner error:', e);
        res.status(500).json({ error: e.message });
    }
});

// 3.1 Self-delete User (called by the user themselves from My Page)
app.post('/api/user/delete', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

    try {
        // Fetch user email and profile before deletion
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_id, subscription_tier, subscription_expires_at, created_at')
            .eq('id', userId)
            .single();

        // Record in deleted_accounts for trial abuse prevention
        if (authUser?.email) {
            const hadTrial = profile?.subscription_tier === 'pro';
            await supabase.from('deleted_accounts').insert({
                email: authUser.email.toLowerCase(),
                had_trial: hadTrial,
                subscription_tier: profile?.subscription_tier || 'free',
                original_created_at: profile?.created_at || null
            });
        }

        // Cancel PayPal subscription if active
        if (profile?.subscription_id) {
            try {
                const accessToken = await getPayPalAccessToken();
                const environmentUrl = process.env.PAYPAL_MODE === 'live'
                    ? 'https://api-m.paypal.com'
                    : 'https://api-m.sandbox.paypal.com';

                const response = await fetch(`${environmentUrl}/v1/billing/subscriptions/${profile.subscription_id}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ reason: 'User account deletion' })
                });

                if (!response.ok && response.status !== 204) {
                    const errorData = await response.json();
                    console.warn('PayPal cancel during delete (non-fatal):', errorData.message || response.statusText);
                } else {
                    // Update profile: clear subscription_id but KEEP pro tier until it expires
                    await supabase
                        .from('profiles')
                        .update({ subscription_id: null })
                        .eq('id', userId);
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

// --- PayPal Subscription APIs ---

async function getPayPalAccessToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    const environmentUrl = process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const response = await fetch(`${environmentUrl}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    const data = await response.json();
    return data.access_token;
}

app.post('/api/subscription/activate', async (req, res) => {
    const { userId, subscriptionId } = req.body;
    if (!userId || !subscriptionId) {
        return res.status(400).json({ success: false, error: 'Missing userId or subscriptionId' });
    }

    try {
        const accessToken = await getPayPalAccessToken();
        const environmentUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // Get subscription details from PayPal
        const response = await fetch(`${environmentUrl}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`PayPal API error: ${errorData.message || response.statusText}`);
        }

        const subscription = await response.json();

        // Update user profile in Supabase
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                subscription_tier: 'pro',
                subscription_id: subscriptionId,
                subscription_expires_at: subscription.billing_info.next_billing_time
            })
            .eq('id', userId);

        if (profileError) throw profileError;

        // ═══════════════════════════════════════════════════════
        // AFFILIATE COMMISSION: Track payment for referred users
        // ═══════════════════════════════════════════════════════
        try {
            // Check if this user was referred by a partner
            const { data: referral } = await supabase
                .from('affiliate_referrals')
                .select('id, partner_id, ref_code, status')
                .eq('referred_user_id', userId)
                .single();

            if (referral && referral.partner_id) {
                // Update referral status to 'paid'
                await supabase
                    .from('affiliate_referrals')
                    .update({ status: 'paid' })
                    .eq('id', referral.id);

                // Get partner's commission rate
                const { data: partner } = await supabase
                    .from('affiliate_partners')
                    .select('commission_rate')
                    .eq('id', referral.partner_id)
                    .single();

                const commissionRate = partner?.commission_rate || 20; // default 20%
                const paymentAmount = 14.99; // K-Vant Pro monthly price
                const commission = parseFloat((paymentAmount * commissionRate / 100).toFixed(2));

                // Upsert partner_stats: increment paid_conversions and add earnings
                const { data: existingStats } = await supabase
                    .from('partner_stats')
                    .select('*')
                    .eq('partner_id', referral.partner_id)
                    .single();

                if (existingStats) {
                    await supabase
                        .from('partner_stats')
                        .update({
                            paid_conversions: (existingStats.paid_conversions || 0) + 1,
                            total_earnings: parseFloat(((existingStats.total_earnings || 0) + commission).toFixed(2)),
                            available_payout: parseFloat(((existingStats.available_payout || 0) + commission).toFixed(2)),
                            active_trials: Math.max(0, (existingStats.active_trials || 0) - 1),
                            updated_at: new Date().toISOString()
                        })
                        .eq('partner_id', referral.partner_id);
                } else {
                    await supabase
                        .from('partner_stats')
                        .insert({
                            partner_id: referral.partner_id,
                            paid_conversions: 1,
                            total_earnings: commission,
                            available_payout: commission,
                            updated_at: new Date().toISOString()
                        });
                }

                console.log(`✅ Affiliate commission: $${commission} credited to partner ${referral.partner_id} for user ${userId}`);
            }
        } catch (affErr) {
            // Non-fatal: don't break the subscription flow if affiliate tracking fails
            console.error('⚠️ Affiliate commission tracking error (non-fatal):', affErr.message);
        }

        res.json({ success: true, message: 'Subscription activated successfully' });
    } catch (error) {
        console.error('Subscription activation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/paypal/cancel', async (req, res) => {
    const { userId } = req.body;
    try {
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('subscription_id')
            .eq('id', userId)
            .single();

        if (fetchError || !profile?.subscription_id) {
            throw new Error('No active subscription found for this user');
        }

        const accessToken = await getPayPalAccessToken();
        const environmentUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const response = await fetch(`${environmentUrl}/v1/billing/subscriptions/${profile.subscription_id}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ reason: 'User requested cancellation' })
        });

        if (!response.ok && response.status !== 204) {
            const errorData = await response.json();
            throw new Error(`PayPal API error: ${errorData.message || response.statusText}`);
        }

        // Update profile: clear subscription_id but KEEP pro tier until it expires
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                subscription_id: null
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (error) {
        console.error('Subscription cancel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Announcement Notification Broadcast ---

app.post('/api/admin/announcements/notify', async (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ success: false, error: 'Missing announcement title' });
    }

    try {
        // Fetch all user IDs from profiles
        const { data: profiles, error: fetchError } = await supabase
            .from('profiles')
            .select('id');

        if (fetchError) throw fetchError;
        if (!profiles || profiles.length === 0) {
            return res.json({ success: true, message: 'No users to notify', notified: 0 });
        }

        // Build notification records for every user
        const notifications = profiles.map(p => ({
            user_id: p.id,
            type: 'system',
            title: `📢 ${title}`,
            message: '새로운 공지사항이 등록되었습니다. 공지사항 페이지에서 확인해주세요.',
            link: 'notice',
            is_read: false
        }));

        // Batch insert (Supabase handles arrays)
        const { error: insertError } = await supabase
            .from('user_notifications')
            .insert(notifications);

        if (insertError) {
            console.error('[Announcement Notify] Insert error:', insertError.message);
            throw insertError;
        }

        console.log(`[Announcement Notify] ✅ Notified ${profiles.length} users about: ${title}`);
        res.json({ success: true, notified: profiles.length });
    } catch (error) {
        console.error('[Announcement Notify] Error:', error);
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

// 1. Upload Sourcing Images (User)
app.post('/api/sourcing/upload', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded.' });
        }

        const urls = [];
        for (const file of req.files) {
            const fileExt = path.extname(file.originalname);
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${fileExt}`;
            const filePath = `sourcing/${fileName}`;

            const { data, error } = await supabase.storage
                .from('images') // Ensure you have an 'images' bucket configured
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            urls.push(publicUrlData.publicUrl);
        }

        res.json({ success: true, urls });
    } catch (error) {
        console.error("Image upload failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Submit Sourcing Request (User)
app.post('/api/sourcing/request', async (req, res) => {
    const { user_id, user_email, items, user_message, sns_links, image_urls } = req.body;
    try {
        // Insert into Supabase
        const { data, error } = await supabase
            .from('sourcing_requests')
            .insert([
                { user_id, user_email, items, user_message, sns_links: sns_links || [], image_urls: image_urls || [] }
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

// --- PayPal Checkout (Orders API) for Sourcing ---
app.post('/api/paypal/orders/create', async (req, res) => {
    const { sourcing_request_id } = req.body;
    if (!sourcing_request_id) return res.status(400).json({ success: false, error: 'Missing sourcing_request_id' });

    try {
        // 1. Fetch exact quote amount from DB
        const { data: request, error: dbError } = await supabase
            .from('sourcing_requests')
            .select('estimated_cost, status')
            .eq('id', sourcing_request_id)
            .single();

        if (dbError || !request) throw new Error('Sourcing request not found');
        if (request.status !== 'quoted') throw new Error('Request is not in quoted status');
        if (!request.estimated_cost || request.estimated_cost <= 0) throw new Error('Invalid estimated cost');

        // 2. Get PayPal Access Token
        const accessToken = await getPayPalAccessToken();
        const environmentUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // 3. Create Order
        const response = await fetch(`${environmentUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    reference_id: sourcing_request_id,
                    amount: {
                        currency_code: 'USD',
                        value: parseFloat(request.estimated_cost).toFixed(2)
                    },
                    description: `Sourcing Quote Payment - #${sourcing_request_id.substring(0, 8)}`
                }]
            })
        });

        const orderData = await response.json();
        if (!response.ok) {
            throw new Error(`PayPal API error: ${orderData.message || response.statusText}`);
        }

        res.json({ success: true, id: orderData.id });
    } catch (error) {
        console.error('PayPal Order create error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/paypal/orders/capture', async (req, res) => {
    const { orderID, sourcing_request_id } = req.body;
    if (!orderID || !sourcing_request_id) return res.status(400).json({ success: false, error: 'Missing orderID or sourcing_request_id' });

    try {
        const accessToken = await getPayPalAccessToken();
        const environmentUrl = process.env.PAYPAL_MODE === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // 1. Capture Order
        const response = await fetch(`${environmentUrl}/v2/checkout/orders/${orderID}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const captureData = await response.json();
        if (!response.ok) {
            throw new Error(`PayPal API error: ${captureData.message || response.statusText}`);
        }

        // 2. Verify Capture Status
        if (captureData.status === 'COMPLETED') {
            // Fetch user ID to notify them
            const { data: request } = await supabase
                .from('sourcing_requests')
                .select('user_id')
                .eq('id', sourcing_request_id)
                .single();

            // 3. Update Sourcing Request Status to 'paid'
            const { error: updateError } = await supabase
                .from('sourcing_requests')
                .update({ 
                    status: 'paid',
                    updated_at: new Date().toISOString()
                })
                .eq('id', sourcing_request_id);

            if (updateError) throw updateError;

            // 4. Send Notification
            if (request && request.user_id) {
                supabase.from('user_notifications').insert({
                    user_id: request.user_id,
                    type: 'sourcing',
                    title: '💳 결제 완료 안내',
                    message: `소싱 요청건의 결제가 완료되었습니다. 상품 준비 및 배송이 시작될 예정입니다.`,
                    link: 'sourcing',
                    is_read: false
                }).then(() => {});
            }

            // 텔레그램 알림
            await sendTelegramNotification(`💸 [결제 완료] 소싱 요청 결제 완료!\n- 유저 ID: ${request.user_id || '알 수 없음'}\n- 요청 ID: ${sourcing_request_id}\n- 상태: 결제 완료 (paid)`);

            res.json({ success: true, message: 'Payment captured successfully' });
        } else {
            throw new Error(`Payment not completed. Status: ${captureData.status}`);
        }
    } catch (error) {
        console.error('PayPal Order capture error:', error);
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
// Get all notifications for a user (both read and unread)
app.get('/api/notifications', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: 'User ID is required' });

    try {
        const { data, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ success: true, notifications: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all notifications as read for a user (MUST be before :id/read)
app.put('/api/notifications/mark-all-read', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: 'User ID is required' });

    try {
        const { error } = await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('user_id', user_id)
            .eq('is_read', false);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark single notification as read
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

// Clear all notifications for a user (MUST be before :id delete)
app.delete('/api/notifications/clear', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: 'User ID is required' });

    try {
        const { error } = await supabase
            .from('user_notifications')
            .delete()
            .eq('user_id', user_id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a single notification
app.delete('/api/notifications/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('user_notifications')
            .delete()
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
            // First, fetch the current user profile to check if they have remaining time
            const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_tier, subscription_expires_at')
                .eq('id', userId)
                .single();

            let baseDateStr = null;

            // If they are currently 'pro' and not expired yet, use their existing expiration date as the base
            if (profile && profile.subscription_tier === 'pro' && profile.subscription_expires_at) {
                const currentExpiry = new Date(profile.subscription_expires_at);
                const now = new Date();
                if (currentExpiry > now) {
                    baseDateStr = profile.subscription_expires_at;
                }
            }

            // Use PayPal's next_billing_time or current date + 30 days
            let newCycleDurationMs = 30 * 24 * 60 * 60 * 1000; // fallback roughly 30 days
            if (captureData.billing_info && captureData.billing_info.next_billing_time) {
                const paypalNextBilling = new Date(captureData.billing_info.next_billing_time);
                newCycleDurationMs = paypalNextBilling.getTime() - Date.now();
            }

            // Calculate the final expiresAt date
            let expiresAt = baseDateStr ? new Date(baseDateStr) : new Date();
            // Add the new cycle duration on top of the base date
            expiresAt = new Date(expiresAt.getTime() + newCycleDurationMs);

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

            // 텔레그램 알림
            await sendTelegramNotification(`👑 [구독 완료] 새로운 Pro 플랜 구독자 발생!\n- 유저 ID: ${userId}\n- 구독 ID: ${subscriptionID}\n- 만료일: ${expiresAt.toISOString().split('T')[0]}`);

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

// Ensure steady-sellers storage bucket exists
(async () => {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === 'steady-sellers');
        if (!exists) {
            await supabase.storage.createBucket('steady-sellers', { public: true });
            console.log('[Storage] Created steady-sellers bucket');
        }
    } catch (e) {
        console.warn('[Storage] Bucket check/create failed:', e.message);
    }
})();

// Ensure image_urls column exists (migration)
(async () => {
    try {
        await supabase.rpc('_exec_sql', { sql: `ALTER TABLE steady_sellers ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'` });
    } catch (e) {
        // Column may already exist or RPC not available — ignore silently
    }
})();

// Upload images for steady sellers (max 5)
app.post('/api/admin/steady-sellers/upload', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files uploaded' });
        }

        const urls = [];
        for (const file of req.files) {
            const ext = file.originalname.split('.').pop() || 'jpg';
            const filePath = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('steady-sellers')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: publicUrl } = supabase.storage
                .from('steady-sellers')
                .getPublicUrl(filePath);

            urls.push(publicUrl.publicUrl);
        }

        res.json({ success: true, urls });
    } catch (error) {
        console.error('[Upload] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

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
        const { product_name, brand, price, image_url, image_urls, description, rank, is_active, product_size, product_weight, notes, options } = req.body;
        const insertData = { product_name, brand, price, rank, is_active, description: description || '', product_size: product_size || '', product_weight: product_weight || '', notes: notes || '', options: options || [] };
        // Support both image_urls (new) and image_url (legacy)
        if (image_urls && image_urls.length > 0) {
            insertData.image_urls = image_urls;
            insertData.image_url = image_urls[0]; // backward compat
        } else if (image_url) {
            insertData.image_url = image_url;
            insertData.image_urls = [image_url];
        }

        const { data, error } = await supabase
            .from('steady_sellers')
            .insert([insertData])
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
        const { product_name, brand, price, image_url, image_urls, description, rank, is_active, product_size, product_weight, notes, options } = req.body;
        const updateData = { product_name, brand, price, rank, is_active, description: description || '', product_size: product_size || '', product_weight: product_weight || '', notes: notes || '', options: options || [], updated_at: new Date() };

        if (image_urls && image_urls.length > 0) {
            updateData.image_urls = image_urls;
            updateData.image_url = image_urls[0];
        } else if (image_url) {
            updateData.image_url = image_url;
            updateData.image_urls = [image_url];
        }

        const { data, error } = await supabase
            .from('steady_sellers')
            .update(updateData)
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

// --- Product Review Scraper Endpoint ---
// Fetches live review data from Olive Young product detail page via Playwright
app.get('/api/product-reviews', async (req, res) => {
    const { goodsNo } = req.query;
    if (!goodsNo) {
        return res.status(400).json({ success: false, error: 'goodsNo parameter required' });
    }

    try {
        // First check if we already have fresh review data in DB
        const { data: existing } = await supabase
            .from('products_master')
            .select('review_count, review_rating')
            .eq('product_id', goodsNo)
            .eq('source', 'oliveyoung')
            .single();

        if (existing && existing.review_count > 0 && existing.review_rating > 0 && existing.review_rating <= 5) {
            return res.json({
                success: true,
                source: 'cache',
                reviewCount: existing.review_count,
                rating: existing.review_rating,
                reviews: []
            });
        }

        // Run the Python Playwright scraper
        const scriptPath = path.join(__dirname, 'generic_crawler', 'update_oy_reviews.py');
        const { stdout, stderr } = await execAsync(`python3 "${scriptPath}" "${goodsNo}"`, {
            timeout: 90000,  // 90s timeout (Playwright + Cloudflare wait)
            cwd: __dirname
        });

        if (stderr) console.warn('[Review Scraper] stderr:', stderr);

        const result = JSON.parse(stdout.trim());

        if (result.error) {
            return res.status(500).json({ success: false, error: result.error });
        }

        // Update DB with fetched review data if valid
        if (result.reviewCount > 0 || (result.rating > 0 && result.rating <= 5)) {
            const updateData = {};
            if (result.reviewCount > 0) updateData.review_count = result.reviewCount;
            if (result.rating > 0 && result.rating <= 5) updateData.review_rating = result.rating;

            if (Object.keys(updateData).length > 0) {
                await supabase
                    .from('products_master')
                    .update(updateData)
                    .eq('product_id', goodsNo)
                    .eq('source', 'oliveyoung');
            }
        }

        res.json({
            success: true,
            source: 'live',
            reviewCount: result.reviewCount,
            rating: result.rating,
            reviews: result.reviews || []
        });

    } catch (error) {
        console.error('[Review Scraper] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- YouTube Outreach APIs ---

// 1. Get Campaigns
app.get('/api/admin/youtube/campaigns', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('youtube_campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, campaigns: data });
    } catch (error) {
        console.error("Fetch campaigns failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Run Extractor (Native Node)
app.post('/api/admin/youtube/run-extractor', async (req, res) => {
    const { keyword, max_results, llm_filter } = req.body;
    if (!keyword) return res.status(400).json({ success: false, error: 'Keyword is required' });
    try {
        const count = max_results ? parseInt(max_results) : 10;
        
        // Await the extraction (now parallelized to avoid Vercel timeout)
        const result = await extractAndSaveChannels(supabase, keyword, count, llm_filter);
        console.log(`[YouTube Extraction Finished]: ${result.message}`);
        
        res.json({ success: true, message: result.message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Manual Send Mailer
app.post('/api/admin/youtube/send/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { emailSubject, emailBody } = req.body;
        
        await sendEmailToChannel(supabase, id, emailSubject, emailBody);
        
        res.json({ success: true, message: '발송 완료되었습니다.' });
    } catch (error) {
        console.error("Send Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Track Read Receipts (1x1 Pixel)
app.get('/api/admin/youtube/track/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (id && id !== 'undefined') {
            await supabase
                .from('youtube_campaigns')
                .update({ opened_at: new Date().toISOString() })
                .eq('id', id)
                .is('opened_at', null); // Only update if not previously opened
        }
    } catch (e) {
        console.error("Tracking Error:", e);
    }
    
    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(pixel);
});

// 5. Manual Lead Registration
app.post('/api/admin/youtube/campaigns', async (req, res) => {
    try {
        const { channel_name, email, channel_url, keyword } = req.body;
        if (!channel_name || !email) {
            return res.status(400).json({ success: false, error: '채널명과 이메일은 필수입니다.' });
        }
        const { error } = await supabase.from('youtube_campaigns').insert([{
            channel_name,
            email,
            channel_url: channel_url || '',
            keyword: keyword || '',
            status: 'pending'
        }]);
        if (error) throw error;
        res.json({ success: true, message: '리드가 등록되었습니다.' });
    } catch (error) {
        console.error("Add Lead Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Delete Campaign
app.delete('/api/admin/youtube/campaigns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('youtube_campaigns').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: '삭제 완료' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Test Email Send
app.post('/api/admin/youtube/test-email', async (req, res) => {
    try {
        const { emailSubject, emailBody } = req.body;
        if (!emailSubject || !emailBody) {
            return res.status(400).json({ success: false, error: '제목과 본문을 입력하세요.' });
        }

        const smtpUser = process.env.SMTP_USER;
        const smtpPassword = process.env.SMTP_PASSWORD;
        if (!smtpUser || !smtpPassword) {
            return res.status(500).json({ success: false, error: 'SMTP 설정 없음' });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: (process.env.SMTP_PORT || '587') === '465',
            auth: { user: smtpUser, pass: smtpPassword }
        });

        // Replace template variables with test values
        const testChannelName = '테스트 채널 (Test Channel)';
        let finalSubject = emailSubject.replace(/\{\{channelName\}\}/g, testChannelName);
        let finalBody = emailBody.replace(/\{\{channelName\}\}/g, testChannelName);

        await transporter.sendMail({
            from: `"K-Vant Team" <${smtpUser}>`,
            to: 'roundbase84@gmail.com',
            subject: `[TEST] ${finalSubject}`,
            html: finalBody
        });

        res.json({ success: true, message: '테스트 메일이 roundbase84@gmail.com으로 발송되었습니다!' });
    } catch (error) {
        console.error("Test Mail Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===================== OUTREACH CRM =====================

// CRM: List leads (with optional status filter)
app.get('/api/admin/crm', async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabase.from('outreach_crm').select('*').order('updated_at', { ascending: false });
        if (status && status !== 'all') query = query.eq('status', status);
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, leads: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CRM: Add lead
app.post('/api/admin/crm', async (req, res) => {
    try {
        const { platform, account_name, contact_info, memo } = req.body;
        if (!account_name) return res.status(400).json({ success: false, error: '계정명은 필수입니다.' });
        const { error } = await supabase.from('outreach_crm').insert([{
            platform: platform || 'other',
            account_name,
            contact_info: contact_info || '',
            status: 'pending',
            memo: memo || ''
        }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CRM: Update lead (status / memo)
app.patch('/api/admin/crm/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('outreach_crm').update(updates).eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CRM: Delete lead
app.delete('/api/admin/crm/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('outreach_crm').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE PARTNER SYSTEM API
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: parse cookies from request
function parseCookies(req) {
    const cookies = {};
    const header = req.headers.cookie || '';
    header.split(';').forEach(c => {
        const [k, ...v] = c.trim().split('=');
        if (k) cookies[k] = decodeURIComponent(v.join('='));
    });
    return cookies;
}

// GET /api/affiliate/get-ref — Read ref code from httpOnly cookie (frontend can't read it directly)
app.get('/api/affiliate/get-ref', (req, res) => {
    const cookies = parseCookies(req);
    const ref = cookies.kvant_ref || null;
    res.json({ ref });
});

// GET /api/affiliate/stats — Partner KPI dashboard data (reads ONLY from partner_stats summary table)
app.get('/api/affiliate/stats', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.replace('Bearer ', '');
        // Get user from token
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

        // Find partner by user_id
        const { data: partner, error: partnerErr } = await supabase
            .from('affiliate_partners')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (partnerErr || !partner) return res.status(404).json({ error: 'Partner not found' });

        // Read pre-aggregated stats
        const { data: stats } = await supabase
            .from('partner_stats')
            .select('*')
            .eq('partner_id', partner.id)
            .single();

        res.json({
            partner,
            stats: stats || {
                total_signups: 0,
                active_trials: 0,
                paid_conversions: 0,
                total_earnings: 0,
                available_payout: 0
            }
        });
    } catch (e) {
        console.error('affiliate stats error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/affiliate/payouts — Payout history
app.get('/api/affiliate/payouts', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

        const { data: partner } = await supabase
            .from('affiliate_partners')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        const { data: payouts } = await supabase
            .from('partner_payouts')
            .select('*')
            .eq('partner_id', partner.id)
            .order('requested_at', { ascending: false })
            .limit(20);

        res.json({ payouts: payouts || [] });
    } catch (e) {
        console.error('affiliate payouts error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/affiliate/request-payout — Request payout
app.post('/api/affiliate/request-payout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

        const { data: partner } = await supabase
            .from('affiliate_partners')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        // Get available payout
        const { data: stats } = await supabase
            .from('partner_stats')
            .select('available_payout')
            .eq('partner_id', partner.id)
            .single();

        const available = stats?.available_payout || 0;
        if (available <= 0) return res.status(400).json({ error: 'No available payout' });

        // Create payout request
        await supabase.from('partner_payouts').insert({
            partner_id: partner.id,
            amount: available,
            status: 'pending'
        });

        // Reset available payout
        await supabase.from('partner_stats').update({
            available_payout: 0,
            updated_at: new Date().toISOString()
        }).eq('partner_id', partner.id);

        res.json({ success: true, amount: available });
    } catch (e) {
        console.error('affiliate payout request error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/affiliate/record-referral — Called during signup to record a referral
app.post('/api/affiliate/record-referral', async (req, res) => {
    try {
        const { ref_code, user_id } = req.body;
        if (!ref_code || !user_id) return res.status(400).json({ error: 'Missing ref_code or user_id' });

        // Find the partner
        const { data: partner, error: partnerErr } = await supabase
            .from('affiliate_partners')
            .select('id')
            .eq('ref_code', ref_code)
            .eq('status', 'active')
            .single();

        if (partnerErr || !partner) return res.status(404).json({ error: 'Invalid referral code' });

        // Check if already referred
        const { data: existing } = await supabase
            .from('affiliate_referrals')
            .select('id')
            .eq('referred_user_id', user_id)
            .limit(1);

        if (existing && existing.length > 0) return res.json({ success: true, message: 'Already referred' });

        // Create referral record
        await supabase.from('affiliate_referrals').insert({
            partner_id: partner.id,
            referred_user_id: user_id,
            ref_code: ref_code,
            status: 'signed_up'
        });

        // Update partner_stats
        await supabase.rpc('increment_partner_signups', { p_id: partner.id }).catch(() => {
            // If RPC doesn't exist, update manually
            supabase.from('partner_stats')
                .upsert({
                    partner_id: partner.id,
                    total_signups: 1,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'partner_id' });
        });

        res.json({ success: true });
    } catch (e) {
        console.error('record referral error:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// ═════════════════════════════════════════════════════════════════════
// PARTNER ADMIN & INVITE API
// ═════════════════════════════════════════════════════════════════════

// GET /api/admin/partners — Load all partners and their stats
app.get('/api/admin/partners', async (req, res) => {
    try {

        const { data: partners, error } = await supabase
            .from('affiliate_partners')
            .select(`
                id, user_id, ref_code, name, email, commission_rate, status, created_at,
                partner_stats ( total_signups, active_trials, paid_conversions, total_earnings, available_payout )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, partners });
    } catch (e) {
        console.error('Load partners error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Helper: Secure Invite Token Generator
const INVITE_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'kvant-default-secret-fallback';

// POST /api/admin/partners/invite — Generate an invite link
app.post('/api/admin/partners/invite', async (req, res) => {
    try {
        const { commission_rate } = req.body;
        const payload = Buffer.from(JSON.stringify({ 
            rate: commission_rate || 20, 
            exp: Date.now() + 86400000 * 30 // 30 days expiry
        })).toString('base64');
        
        const signature = crypto.createHmac('sha256', INVITE_SECRET).update(payload).digest('base64url');
        const token = `${payload}.${signature}`;
        
        res.json({ success: true, token });
    } catch (e) {
        console.error('Generate invite error:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/partner/join — User accepts an invite link
app.post('/api/partner/join', async (req, res) => {
    try {
        // Authenticate the user calling this endpoint
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const authToken = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userErr } = await supabase.auth.getUser(authToken);
        if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Missing invite token' });

        // Verify the invite token
        const parts = token.split('.');
        if (parts.length !== 2) return res.status(400).json({ error: 'Invalid token format' });
        
        const [payload, signature] = parts;
        const expectedSig = crypto.createHmac('sha256', INVITE_SECRET).update(payload).digest('base64url');
        
        if (expectedSig !== signature) return res.status(400).json({ error: 'Invalid or forged token' });
        
        const data = JSON.parse(Buffer.from(payload, 'base64').toString());
        if (data.exp < Date.now()) return res.status(400).json({ error: 'Token expired' });

        // User is legitimate, token is valid. Let's make them a partner.
        // First check if they are already a partner
        const { data: existing } = await supabase
            .from('affiliate_partners')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
        if (existing) return res.json({ success: true, message: 'Already a partner' });

        // Generate a 6-character referral code (KV + random 4 chars)
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const refCode = `KV${randomStr}`;

        // Get user profile to get their name
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const partnerName = profile?.full_name || user.email.split('@')[0];

        // 1. Insert into affiliate_partners
        const { data: newPartner, error: insertErr } = await supabase
            .from('affiliate_partners')
            .insert({
                user_id: user.id,
                ref_code: refCode, // Will uniquely fail if collision (rare)
                name: partnerName,
                email: user.email,
                commission_rate: data.rate || 20
            })
            .select('id')
            .single();

        if (insertErr) throw insertErr;

        // 2. Initialize partner_stats
        await supabase.from('partner_stats').insert({
            partner_id: newPartner.id,
            total_signups: 0, active_trials: 0, paid_conversions: 0, total_earnings: 0, available_payout: 0
        });

        res.json({ success: true, ref_code: refCode });
    } catch (e) {
        console.error('Partner join error:', e);
        res.status(500).json({ error: e.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Data Pool Admin Backend running on http://localhost:${PORT}`);
    });
}

export default app;
