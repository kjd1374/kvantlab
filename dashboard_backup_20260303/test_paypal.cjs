require('dotenv').config();
const https = require('https');

const clientId = process.env.PAYPAL_CLIENT_ID;
const secret = process.env.PAYPAL_SECRET;
const mode = process.env.PAYPAL_MODE || 'sandbox';

console.log('Testing with Mode:', mode);
console.log('Client ID:', clientId ? (clientId.substring(0, 5) + '...') : 'Missing');

const auth = Buffer.from(clientId + ':' + secret).toString('base64');
const hostname = mode === 'live' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';

const options = {
  hostname: hostname,
  path: '/v1/oauth2/token',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + auth,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- Token Auth Response (' + mode + ') ---');
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Success! Token generated.');
      const token = JSON.parse(data).access_token;
      checkPlan(token, hostname);
    } else {
      console.log('Body:', data);
    }
  });
});

req.write('grant_type=client_credentials');
req.end();

function checkPlan(token, hostname) {
  const planId = process.env.PAYPAL_PLAN_ID;
  const planOptions = {
    hostname: hostname,
    path: '/v1/billing/plans/' + planId,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  };
  
  const planReq = https.request(planOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('\n--- Plan Info Response ---');
      console.log('Status:', res.statusCode);
      try {
        console.log('Body:', JSON.stringify(JSON.parse(data), null, 2));
      } catch(e) {
        console.log('Body:', data);
      }
    });
  });
  planReq.end();
}
