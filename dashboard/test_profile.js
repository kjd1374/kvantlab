import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    const { data: users, error: err1 } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === 'kjd1374@naver.com');
    if (user) {
        const { data: profile, error: err2 } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        console.log("Profile for kjd1374@naver.com:", profile);
    } else {
        console.log("User not found via admin API.");
    }
})();
