import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { query } from './supabase_node.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config(); // Loads .env for SMTP credentials

const EXPECTED_SOURCES = ['oliveyoung', 'musinsa', 'ably', 'shinsegae'];

async function sendAlertEmail(subject, message) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpServer = process.env.SMTP_SERVER || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const toEmail = process.env.NOTIFICATION_EMAIL || smtpUser;

    if (!smtpUser || !smtpPassword) {
        console.warn('SMTP credentials not found, cannot send alert email.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword }
    });

    const mailOptions = {
        from: `"K-Vant Alert" <${smtpUser}>`,
        to: toEmail,
        subject: `[🚨 URGENT] K-Vant System Alert: ${subject}`,
        text: message
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Alert email sent to ${toEmail}`);
    } catch (err) {
        console.error('Failed to send alert email:', err);
    }
}

async function checkProgress() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking progress for date: ${today}`);

    try {
        const { data } = await query('daily_rankings_v2', `select=source,category_code&date=eq.${today}`);

        const stats = {};
        (data || []).forEach(row => {
            const src = row.source || 'unknown';
            const cat = row.category_code || 'unknown';
            if (!stats[src]) stats[src] = { total: 0, categories: {} };
            if (!stats[src].categories[cat]) stats[src].categories[cat] = 0;

            stats[src].total++;
            stats[src].categories[cat]++;
        });

        for (const source of EXPECTED_SOURCES) {
            const sourceStats = stats[source];
            if (!sourceStats || sourceStats.total === 0) {
                console.error(`CRITICAL: 0 rows found for ${source} today! Alerting Admin.`);
                await sendAlertEmail(`Crawling Failed - ${source}`, `The crawler failed to fetch any data from ${source} for ${today}. Please check the server logs immediately as the UI might appear empty to users.`);
            } else {
                console.log(`\nTotal ${source} rows today: ${sourceStats.total}`);
                console.log('Breakdown by Category Code:');
                for (const [cat, count] of Object.entries(sourceStats.categories)) {
                    console.log(`- ${cat}: ${count}`);
                }
            }
        }

    } catch (err) {
        console.error('Error fetching data:', err);
        await sendAlertEmail('Crawler Progress Check Failed', `An error occurred while checking crawler progress: \n\n${err.message}`);
    }
}

checkProgress();
