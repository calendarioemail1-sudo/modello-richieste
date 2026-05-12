const VALID_EMAIL = 'giordass@libero.it';
const VALID_PASSWORD = 'gray8937@';
const SESSION_TOKEN = 'gv_storico_9f3a2b8c1e7d4f6a0b5c2d9e8f1a3b7c';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};

  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    return res.status(200).json({ success: true, token: SESSION_TOKEN });
  }

  return res.status(401).json({ success: false, error: 'Credenziali non valide' });
}
