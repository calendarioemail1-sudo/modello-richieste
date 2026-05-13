import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

const ADMIN_EMAIL = 'giordass@libero.it';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Solo l\'admin può eliminare utenti.' });

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email mancante' });
    if (email === ADMIN_EMAIL) return res.status(400).json({ error: 'Non puoi eliminare l\'account admin principale.' });
    await sql`DELETE FROM users WHERE email = ${email}`;
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
