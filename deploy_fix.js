import fs from 'fs';

const token = 'sbp_36827ef06d69c48fbd7149f7e570bf85801ea5b8';
const ref = 'cogjucqjenpxgprtfkmz';
const apiKey = 'AIzaSyAol8txkYnzJio4E7l1f1IVinKDLTzcvEg';

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
