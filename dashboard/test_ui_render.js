const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const mainJs = fs.readFileSync('main.js', 'utf8');

console.log("--- Checking index.html ---");
if (indexHtml.includes('data-platform="modernhouse"')) {
    console.log("✅ Modern House tab is present in index.html");
} else {
    console.log("❌ Modern House tab is MISSING in index.html");
}

console.log("\n--- Checking main.js ---");
if (mainJs.includes("modernhouse: ModernHouseBridge")) {
    console.log("✅ ModernHouseBridge is registered in main.js");
} else {
    console.log("❌ ModernHouseBridge is MISSING in main.js");
}

if (mainJs.includes("${(p.url || p.product_url)")) {
    console.log("✅ Link fallback logic (p.url || p.product_url) is present");
} else {
    console.log("❌ Link fallback logic is MISSING");
}

if (mainJs.includes("${p.review_count > 0 ? formatNumber(p.review_count) : '0'}")) {
    console.log("✅ Review count zero-handler is present");
} else {
    console.log("❌ Review count zero-handler is MISSING");
}
