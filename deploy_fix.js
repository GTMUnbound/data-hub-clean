import fs from 'fs';
import 'dotenv/config';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const apiKey = process.env.GEMINI_API_KEY;

if (!token || !ref || !apiKey) {
  console.error("Missing required environment variables in your .env file!");
  console.error("Please ensure SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, and GEMINI_API_KEY are set.");
  process.exit(1);
}


async function setup() {
  console.log('Setting secrets...');
  const resSecrets = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ name: 'GEMINI_API_KEY', value: apiKey }]),
  });
  console.log('Secrets status:', resSecrets.status);

  console.log('Deploying function...');
  const code = fs.readFileSync('supabase/functions/ai-chat/index.ts', 'utf8');
  const resFunc = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'ai-chat',
      slug: 'ai-chat',
      body: code,
      verify_jwt: false,
    }),
  });
  console.log('Function status:', resFunc.status);
  const data = await resFunc.json().catch(() => ({}));
  console.log('Response:', data);
}

setup();
