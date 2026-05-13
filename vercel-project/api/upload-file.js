import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

async function ensureFilesSchema() {
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
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Solo gli admin possono caricare file' });

  try {
    await ensureFilesSchema();
    const { name, format, size, data, permissions } = req.body || {};
    if (!name || !data) return res.status(400).json({ error: 'Dati mancanti' });

    await sql`
      INSERT INTO files (name, format, size, uploaded_by, permissions, data)
      VALUES (${name}, ${format || ''}, ${size || 0}, ${user.email}, ${permissions || 'all'}, ${data})
    `;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}
