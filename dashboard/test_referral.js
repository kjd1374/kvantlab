import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hgxblbbjlnsfkffwvfao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJsYmJqbG5zZmtmZnd2ZmFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2NTY4NiwiZXhwIjoyMDc5NjQxNjg2fQ.SRxircIxDPE9Z8xElZzUFK_l9yOsjtKEoAnd7ILpKh8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    try {
        const refCode = 'KVEHPZ';
        const fakeUserId = '11111111-2222-3333-4444-555555555555';
        console.log(`1. Finding partner with ref_code: ${refCode}`);
        
        const { data: partner, error: partnerError } = await supabase
            .from('affiliate_partners')
            .select('id')
            .eq('ref_code', refCode)
            .eq('status', 'active')
            .single();
            
        if (partnerError || !partner) {
            console.error('Partner error:', partnerError);
            return;
        }
        
        console.log(`2. Found partner ID: ${partner.id}. Inserting referral...`);
        const { error: insertError } = await supabase.from('affiliate_referrals').insert({
            partner_id: partner.id,
            referred_user_id: fakeUserId,
            ref_code: refCode,
            status: 'signed_up'
        });
        
        if (insertError) {
            console.error('Insert referral error:', insertError);
            return;
        }
        
        console.log(`3. Referral inserted. Proceeding to increment stats...`);
        const { error: rpcError } = await supabase.rpc('increment_partner_signups', { p_id: partner.id });
        
        if (rpcError) {
            console.log('RPC failed (expected). Message:', rpcError.message);
            console.log('4. Triggering manual fallback...');
            
            const { data: currentStats } = await supabase.from('partner_stats').select('total_signups').eq('partner_id', partner.id).single();
            console.log('Current signups:', currentStats?.total_signups);
            
            const newTotal = (currentStats?.total_signups || 0) + 1;
            
            const { error: upsertError } = await supabase.from('partner_stats').upsert({
                partner_id: partner.id,
                total_signups: newTotal,
                updated_at: new Date().toISOString()
            }, { onConflict: 'partner_id' });
            
            if (upsertError) {
                console.error('Manual fallback failed:', upsertError);
            } else {
                console.log(`5. Manual fallback SUCCESS! New total should be: ${newTotal}`);
            }
        } else {
            console.log('RPC succeeded? (Unexpected)');
        }
    } catch (e) {
        console.error('Test script crashed:', e);
    }
}

runTest();
