const https = require('https');

const clientId = "AXGOwD9JXnOE5Y2aLifrFqo7Mzz-zGBnFO5j7kzygueYu1zoVrmZJW0Ewq7dSrcdhl3fklvXNYAx9MKU";
const baseSecret = "EHix-Am{1}Sxjmv7KA9DNYjzLBM{2}FRXmCrPPg4_9pNeuW_fhyPim7yctoXizrA9VhNfsrFGinhHs3fqcJU";

const chars = ['I', 'l', '1'];
const secrets = [];

for (let c1 of chars) {
  for (let c2 of chars) {
    secrets.push(baseSecret.replace('{1}', c1).replace('{2}', c2));
  }
}

// Additional test just in case AmlS/AmlS -> maybe the `l` is `I`?
// The user copy pasted: EHix-AmlSxjmv7KA9DNYjzLBMIFRXmCrPPg4_9pNeuW_fhyPim7yctoXizrA9VhNfsrFGinhHs3fqcJU
secrets.push("EHix-AmlSxjmv7KA9DNYjzLBMIFRXmCrPPg4_9pNeuW_fhyPim7yctoXizrA9VhNfsrFGinhHs3fqcJU");

async function testSecret(secret) {
  return new Promise((resolve) => {
    const auth = Buffer.from(clientId + ':' + secret).toString('base64');
    const options = {
      hostname: 'api-m.sandbox.paypal.com',
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
            if (res.statusCode === 200) resolve({ secret, success: true });
            else resolve({ secret, success: false });
        });
    });
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function run() {
  for (let s of secrets) {
    const res = await testSecret(s);
    if (res.success) {
      console.log("SUCCESS! EXACT SECRET IS:", s);
      return;
    }
  }
  console.log("ALL FAILED.");
}

run();
