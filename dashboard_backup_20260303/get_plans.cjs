require('dotenv').config();
const https = require('https');

const clientId = process.env.PAYPAL_CLIENT_ID;
const secret = process.env.PAYPAL_SECRET;
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
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const token = JSON.parse(data).access_token;
      listPlans(token);
    } else {
      console.log('Auth Failed:', data);
    }
  });
});
req.write('grant_type=client_credentials');
req.end();

function listPlans(token) {
  const planOptions = {
    hostname: 'api-m.sandbox.paypal.com',
    path: '/v1/billing/plans?page_size=10&page=1&total_required=true',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  };
  
  const planReq = https.request(planOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('--- Found Plans ---');
        result.plans.forEach(plan => {
          console.log(`Plan Name: ${plan.name}`);
          console.log(`Plan ID:   ${plan.id}`);
          console.log(`Status:    ${plan.status}`);
          console.log('-------------------');
        });
      } catch(e) {
        console.log('Error parsing plans:', e);
      }
    });
  });
  planReq.end();
}
