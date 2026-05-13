import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS operator_code TEXT DEFAULT ''`;

    let rows;
    if (user.role === 'admin') {
      const r = await sql`SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500`;
      rows = r.rows;
    } else {
      const r = await sql`SELECT * FROM submissions WHERE submitted_by = ${user.email} ORDER BY created_at DESC LIMIT 500`;
      rows = r.rows;
    }
    return res.status(200).json({ submissions: rows, role: user.role, email: user.email });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
