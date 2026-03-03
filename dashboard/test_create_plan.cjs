require('dotenv').config();
const https = require('https');

const clientId = process.env.PAYPAL_CLIENT_ID;
const secret = process.env.PAYPAL_SECRET;
const auth = Buffer.from(clientId + ':' + secret).toString('base64');

console.log("Using Client ID:", clientId);

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
      console.log("Auth Success. Creating Product...");
      createProduct(token);
    } else {
      console.log('Auth Failed HTTP', res.statusCode, ':', data);
    }
  });
});
req.write('grant_type=client_credentials');
req.end();

function createProduct(token) {
   const prodData = JSON.stringify({
      name: "Kvantlab Pro Subscription (Test)",
      description: "Monthly Pro Access",
      type: "SERVICE",
      category: "SOFTWARE"
   });
   
   const req = https.request({
       hostname: 'api-m.sandbox.paypal.com',
       path: '/v1/catalogs/products',
       method: 'POST',
       headers: {
           'Authorization': 'Bearer ' + token,
           'Content-Type': 'application/json',
           'PayPal-Request-Id': 'PROD_' + Date.now()
       }
   }, (res) => {
       let data = '';
       res.on('data', c => data += c);
       res.on('end', () => {
           if(res.statusCode === 201) {
              const productId = JSON.parse(data).id;
              console.log("Created Product ID:", productId);
              createPlan(token, productId);
           } else {
              console.log("Product Create Failed", res.statusCode, data);
           }
       });
   });
   req.write(prodData);
   req.end();
}

function createPlan(token, productId) {
   const planData = JSON.stringify({
      product_id: productId,
      name: "Kvantlab Pro Monthly Plan",
      description: "Auto-renewing monthly subscription",
      status: "ACTIVE",
      billing_cycles: [
         {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
               fixed_price: { value: "17.90", currency_code: "USD" }
            }
         }
      ],
      payment_preferences: {
         auto_bill_outstanding: true,
         setup_fee: { value: "0", currency_code: "USD" },
         setup_fee_failure_action: "CONTINUE",
         payment_failure_threshold: 3
      }
   });
   
   const req = https.request({
       hostname: 'api-m.sandbox.paypal.com',
       path: '/v1/billing/plans',
       method: 'POST',
       headers: {
           'Authorization': 'Bearer ' + token,
           'Content-Type': 'application/json',
           'PayPal-Request-Id': 'PLAN_' + Date.now()
       }
   }, (res) => {
       let data = '';
       res.on('data', c => data += c);
       res.on('end', () => {
           if(res.statusCode === 201 || res.statusCode === 200) {
              console.log("SUCCESS! New Sandbox Plan Details:", JSON.parse(data));
           } else {
              console.log("Plan Create Failed", res.statusCode, data);
           }
       });
   });
   req.write(planData);
   req.end();
}
