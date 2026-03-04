const apiKey = process.env.VITE_GEMINI_API_KEY;
const qArray = ["비노트 물톡스 부스터 앰플 30ml", "헤트라스 프리미엄 디퓨저"];
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: `Translate the following list to English. Return ONLY a valid JSON array of strings in exactly the same order. Do not wrap in markdown.\n\n` + JSON.stringify(qArray) }] }],
    generationConfig: { temperature: 0.1 }
  })
}).then(r => r.json()).then(console.log);
