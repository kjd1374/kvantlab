const https = require('https');

const clientId = "AXinu3VwZVezWxSciJezBfCsqghyzJJlTHKCms8YLCHfc691AUyfFMnyIGwtWLCEyZNlDc4nwkyHHMtq";
const secret = "EMg-bIzi1LsN_bDZu98EhDqWiwUGPTM6Z5Ynl2WKtAvdBPqq3m4ulfdWk48tm3be9v2NjPwNaPQ4DH4l";
const planId = "P-4V196281CB810293WNGSW32I";
const auth = Buffer.from(clientId + ':' + secret).toString('base64');

const options = {
  hostname: 'api-m.paypal.com',
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
      const planReq = https.request({
        hostname: 'api-m.paypal.com',
        path: '/v1/billing/plans/' + planId,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }, (pres) => {
          let pdata = '';
          pres.on('data', d => pdata += d);
          pres.on('end', () => {
              const p = JSON.parse(pdata);
              console.log("Plan Detail:", JSON.stringify(p, null, 2));
          });
      });
      planReq.end();
    } else {
      console.log('Auth Failed', res.statusCode, data);
    }
  });
});
req.write('grant_type=client_credentials');
req.end();
