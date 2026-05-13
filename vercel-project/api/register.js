import { sql } from '@vercel/postgres';
import { hashPassword, verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Solo l\'admin può registrare utenti.' });

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS codice TEXT DEFAULT ''`;

    const { email, password, nome, codice } = req.body || {};
    if (!email || !password || !codice) return res.status(400).json({ error: 'Email, password e codice operatore sono obbligatori' });

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email già registrata' });

    const codeCheck = await sql`SELECT id FROM users WHERE codice = ${codice}`;
    if (codeCheck.rows.length > 0) return res.status(409).json({ error: 'Codice operatore già in uso' });

    await sql`
      INSERT INTO users (email, password_hash, role, nome, codice)
      VALUES (${email}, ${hashPassword(password)}, 'user', ${nome || ''}, ${codice})
    `;
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
