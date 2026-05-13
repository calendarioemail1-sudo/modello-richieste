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
    await sql`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        format TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        upload_date TIMESTAMPTZ DEFAULT NOW(),
        uploaded_by TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT 'all',
        data TEXT NOT NULL
      )
    `;

    const result = await sql`
      SELECT id, name, format, size, upload_date, uploaded_by, permissions
      FROM files ORDER BY upload_date DESC
    `;

    let files = result.rows;

    if (user.role !== 'admin') {
      files = files.filter(f => {
        if (f.permissions === 'all') return true;
        try {
          const allowed = JSON.parse(f.permissions);
          return Array.isArray(allowed) && allowed.includes(user.email);
        } catch { return false; }
      });
    }

    return res.status(200).json({ files, role: user.role, email: user.email });
  } catch (err) {
    console.error('Get files error:', err);
    return res.status(500).json({ error: err.message });
  }
}
