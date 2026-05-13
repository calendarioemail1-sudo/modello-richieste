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

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID mancante' });

  try {
    const result = await sql`SELECT * FROM files WHERE id = ${id}`;
    if (result.rows.length === 0) return res.status(404).json({ error: 'File non trovato' });

    const file = result.rows[0];

    if (user.role !== 'admin') {
      if (file.permissions !== 'all') {
        try {
          const allowed = JSON.parse(file.permissions);
          if (!Array.isArray(allowed) || !allowed.includes(user.email)) {
            return res.status(403).json({ error: 'Non hai i permessi per scaricare questo file' });
          }
        } catch {
          return res.status(403).json({ error: 'Non hai i permessi' });
        }
      }
    }

    const buffer = Buffer.from(file.data, 'base64');
    const safeName = encodeURIComponent(file.name);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"; filename*=UTF-8''${safeName}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ error: err.message });
  }
}
