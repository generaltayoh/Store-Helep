const fs = require('fs');
const key = fs.readFileSync('.env', 'utf8').match(/OCR_API_KEY=(.+)/)[1];

// Read the real test image we have
const imgBuf = fs.readFileSync('images/logo.jpg');
const b64 = imgBuf.toString('base64');

const body = {
  systemInstruction: { parts: [{ text: "You are an OCR engine. Respond ONLY with JSON: {\"records\":[]}" }] },
  contents: [{
    parts: [
      { text: "Read items from this store record image." },
      { inline_data: { mime_type: "image/jpeg", data: b64 } }
    ]
  }],
  generationConfig: { temperature: 0.4, responseMimeType: "application/json" }
};

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + key, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(async r => {
  const text = await r.text();
  console.log('Status:', r.status);
  if (!r.ok) console.log('Error:', text.substring(0, 300));
  else console.log('Full response:', text);
}).catch(e => console.log('Fetch error:', e.message));
