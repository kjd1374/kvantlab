const https = require('https');
const clientId = "AXGOwD9JXnOE5Y2aLifrFqo7Mzz-zGBnFO5j7kzygueYu1zoVrmZJW0Ewq7dSrcdhl3fklvXNYAx9MKU";
const secret = "EHix-AmlSxjmv7KA9DNYjzLBMIFRXmCrPPg4_9pNeuW_fhyPim7yctoXizrA9VhNfsrFGinhHs3fqcJU";
const planId = "P-8N581029FN8467203NGSVHDA";
const auth = Buffer.from(clientId + ':' + secret).toString('base64');

const options = {
  hostname: 'api-m.paypal.com', // LIVE
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
      getPlan(token);
    } else {
      console.log('Auth Failed HTTP', res.statusCode, data);
    }
  });
});
req.write('grant_type=client_credentials');
req.end();

function getPlan(token) {
   const planReq = https.request({
       hostname: 'api-m.paypal.com', // LIVE
       path: '/v1/billing/plans/' + planId,
       method: 'GET',
       headers: {
           'Authorization': 'Bearer ' + token,
           'Content-Type': 'application/json'
       }
   }, (res) => {
       let data = '';
       res.on('data', c => data += c);
       res.on('end', () => {
           console.log("Plan API Response:", res.statusCode, data);
       });
   });
   planReq.end();
}
