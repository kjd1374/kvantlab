const https = require('https');

const clientId = "AXinu3VwZVezWxSciJezBfCsqghyzJJlTHKCms8YLCHfc691AUyfFMnyIGwtWLCEyZNlDc4nwkyHHMtq";
const secret = "EMg-bIzi1LsN_bDZu98EhDqWiwUGPTM6Z5Ynl2WKtAvdBPqq3m4ulfdWk48tm3be9v2NjPwNaPQ4DH4l";
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
      console.log("Authentication Success!");
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
           if (res.statusCode !== 200) {
               console.log("We need to create a new plan for this App!");
           }
       });
   });
   planReq.end();
}
