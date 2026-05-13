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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    await ensureFilesSchema();

    // GET — lista file (senza dati binari)
    if (req.method === 'GET') {
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
    }

    // POST — carica file (solo admin)
    if (req.method === 'POST') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Solo gli admin possono caricare file' });
      const { name, format, size, data, permissions } = req.body || {};
      if (!name || !data) return res.status(400).json({ error: 'Dati mancanti' });
      await sql`
        INSERT INTO files (name, format, size, uploaded_by, permissions, data)
        VALUES (${name}, ${format || ''}, ${size || 0}, ${user.email}, ${permissions || 'all'}, ${data})
      `;
      return res.status(200).json({ success: true });
    }

    // PUT — modifica nome/permessi (solo admin)
    if (req.method === 'PUT') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Solo gli admin possono modificare file' });
      const { id } = req.query;
      const { name, permissions } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID mancante' });
      if (name !== undefined && permissions !== undefined) {
        await sql`UPDATE files SET name = ${name}, permissions = ${permissions} WHERE id = ${id}`;
      } else if (name !== undefined) {
        await sql`UPDATE files SET name = ${name} WHERE id = ${id}`;
      } else if (permissions !== undefined) {
        await sql`UPDATE files SET permissions = ${permissions} WHERE id = ${id}`;
      }
      return res.status(200).json({ success: true });
    }

    // DELETE — elimina file (solo admin)
    if (req.method === 'DELETE') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Solo gli admin possono eliminare file' });
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID mancante' });
      await sql`DELETE FROM files WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Files error:', err);
    return res.status(500).json({ error: err.message });
  }
}
