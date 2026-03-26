import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    const fakeUserId = '11111111-2222-3333-4444-555555555555';
    
    console.log('Deleting fake referral...');
    await supabase.from('affiliate_referrals').delete().eq('referred_user_id', fakeUserId);
    
    console.log('Resetting partner stats for KVEHPZ...');
    const { data: partner } = await supabase.from('affiliate_partners').select('id').eq('ref_code', 'KVEHPZ').single();
    
    if (partner) {
        await supabase.from('partner_stats').update({ total_signups: 0 }).eq('partner_id', partner.id);
        console.log('Reset stats to 0.');
    }
}

cleanup();
