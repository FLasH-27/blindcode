const fs = require('fs');

async function listModels() {
  let envFile = "";
  try {
    envFile = fs.readFileSync('.env.local', 'utf8');
  } catch(e) {
    console.error("Could not read .env.local", e);
    return;
  }
  
  const match = envFile.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
  if (!match || !match[1]) {
    console.error("Could not find NEXT_PUBLIC_GEMINI_API_KEY in .env.local");
    return;
  }
  const key = match[1].trim();

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  
  if (data.models) {
    const generateModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
    console.log("AVAILABLE MODELS FOR generateContent:");
    generateModels.forEach(m => console.log(m.name, "-", m.version));
  } else {
    console.log("Error fetching models:", data);
  }
}

listModels();
