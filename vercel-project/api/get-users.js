import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const user = verifyToken(token);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  try {
    const result = await sql`
      SELECT id, email, role, nome, created_at FROM users ORDER BY created_at DESC
    `;
    return res.status(200).json({ users: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
