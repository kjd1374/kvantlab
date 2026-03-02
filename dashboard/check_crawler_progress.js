const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
        const { data, error } = await supabase
            .from('daily_rankings_v2')
            .select('source, category_code, created_at')
            .eq('date', today)
            .eq('source', 'oliveyoung');

        if (error) throw error;

        const stats = {};
        let total = 0;

        data.forEach(row => {
            const cat = row.category_code || 'unknown';
            if (!stats[cat]) stats[cat] = 0;
            stats[cat]++;
            total++;
        });

        console.log(`Total Olive Young rows today: ${total}`);
        if (total === 0) {
            console.error('CRITICAL: 0 rows found for today! Alerting Admin.');
            await sendAlertEmail('Crawling Failed - 0 records today', `The crawler failed to fetch any data from Olive Young for ${today}. Please check the server logs immediately as the UI might appear empty to users.`);
        } else {
            console.log('Breakdown by Category Code:');
            for (const [cat, count] of Object.entries(stats)) {
                console.log(`- ${cat}: ${count}`);
            }
        }

    } catch (err) {
        console.error('Error fetching data:', err);
        await sendAlertEmail('Crawler Progress Check Failed', `An error occurred while checking crawler progress: \n\n${err.message}`);
    }
}

checkProgress();
