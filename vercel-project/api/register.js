import { sql } from '@vercel/postgres';
import { hashPassword, verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const user = verifyToken(token);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato. Solo l\'admin può registrare utenti.' });
  }

  try {
    const { email, password, nome } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email e password sono obbligatori' });

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email già registrata' });
    }

    const passwordHash = hashPassword(password);
    await sql`
      INSERT INTO users (email, password_hash, role, nome)
      VALUES (${email}, ${passwordHash}, 'user', ${nome || ''})
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message });
  }
}
