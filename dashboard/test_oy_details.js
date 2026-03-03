const fetch = require('node-fetch');
async function run() {
  const url = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000241231';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  
  // Extract review count and rating
  let reviewCount = 0;
  let rating = 0;
  
  let match = html.match(/id="reviewInfo"[^>]*>리뷰\s*([0-9,]+)/);
  if (match) reviewCount = parseInt(match[1].replace(/,/g, ''));
  else {
    match = html.match(/리뷰\s*([0-9,]+)건/);
    if (match) reviewCount = parseInt(match[1].replace(/,/g, ''));
  }
  
  let rMatch = html.match(/class="point">[^<]*([0-9.]+)점/);
  if (!rMatch) rMatch = html.match(/별점\s*([0-9.]+)/);
  if (rMatch) rating = parseFloat(rMatch[1]);
  
  // Try to find review content
  // The reviews might be loaded via AJAX. Let's see if there is any review text in the initial HTML or a script block.
  console.log("Review Count:", reviewCount, "Rating:", rating);
  console.log("HTML length:", html.length);
}
run();
