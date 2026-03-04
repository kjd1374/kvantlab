
import fs from 'fs';
import path from 'path';

const src = 'supabase.js';
const dest = 'supabase_node.js';

let content = fs.readFileSync(src, 'utf8');

// Remove URL import
content = content.replace(
    /import { createClient } from ['"]https:\/\/esm\.sh\/@supabase\/supabase-js@2.*?['"];?[\r\n]*/g,
    ""
);

fs.writeFileSync(dest, content);
console.log(`Created ${dest}`);
