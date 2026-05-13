import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Accesso negato' });

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS codice TEXT DEFAULT ''`;
    const result = await sql`SELECT id, email, role, nome, codice, created_at FROM users ORDER BY created_at ASC`;
    return res.status(200).json({ users: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
