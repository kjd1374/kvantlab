import { signIn } from './supabase.js';

(async () => {
    try {
        const result = await signIn('rusilhurpe@gmail.com', '12345678!');
        console.log("SignIn Result:", result);
    } catch(e) {
        console.log("Error:", e);
    }
})();
