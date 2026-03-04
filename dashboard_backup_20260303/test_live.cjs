const https = require('https');

const clientId = "AXGOwD9JXnOE5Y2aLifrFqo7Mzz-zGBnFO5j7kzygueYu1zoVrmZJW0Ewq7dSrcdhl3fklvXNYAx9MKU";
// I'll test the one from the Vercel screenshot which has a lowercase l and capital I
const secret1 = "EHix-AmlSxjmv7KA9DNYjzLBMIFRXmCrPPg4_9pNeuW_fhyPim7yctoXizrA9VhNfsrFGinhHs3fqcJU";
// And I'll test the pure copy paste just in case (e.g. all I's)
const secret2 = "EHix-AmISxjmv7KA9DNYjzLBMIFRXmCrPPg4_9pNeuW_fhyPim7yctoXizrA9VhNfsrFGinhHs3fqcJU";

async function testLive(secret) {
  return new Promise((resolve) => {
    const auth = Buffer.from(clientId + ':' + secret).toString('base64');
    const options = {
      hostname: 'api-m.paypal.com', // LIVE ENDPOINT!
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
            if (res.statusCode === 200) resolve({ secret, success: true, data });
            else resolve({ secret, success: false, data });
        });
    });
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function run() {
  console.log("Testing Live Endpoint...");
  let res = await testLive(secret1);
  if (res.success) { console.log("LIVE SUCCESS 1!"); return; }
  res = await testLive(secret2);
  if (res.success) { console.log("LIVE SUCCESS 2!"); return; }
  console.log("No live success. Both failed:", res.data);
}

run();
