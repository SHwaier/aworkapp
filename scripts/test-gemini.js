const fs = require('fs');

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const payload = {
    systemInstruction: {
      parts: [{ text: "system instruction" }]
    },
    contents: [{
      parts: [{ text: "hello" }]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING", enum: ["job_match", "bullet_quality", "skills", "experience"] },
            title: { type: "STRING" },
            description: { type: "STRING" },
            suggestion: { type: "STRING" },
            severity: { type: "STRING", enum: ["critical", "warning", "suggestion"] }
          },
          required: ["category", "title", "description", "suggestion", "severity"]
        }
      }
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

require('dotenv').config({ path: '.env.local' });
testGemini();
