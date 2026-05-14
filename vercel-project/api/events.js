import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT DEFAULT 'avviso',
      event_date TEXT NOT NULL,
      event_time TEXT DEFAULT '',
      permissions TEXT DEFAULT 'all',
      read_by TEXT DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
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
    await ensureSchema();

    // GET — lista eventi visibili all'utente
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM events ORDER BY event_date ASC, event_time ASC, created_at DESC`;
      const events = result.rows.filter(e => {
        if (e.permissions === 'all') return true;
        try {
          const allowed = JSON.parse(e.permissions);
          return Array.isArray(allowed) && allowed.includes(user.email);
        } catch { return false; }
      }).map(e => {
        let readBy = [];
        try { readBy = JSON.parse(e.read_by || '[]'); } catch {}
        return { ...e, is_read: readBy.includes(user.email) };
      });
      return res.status(200).json({ events, role: user.role, email: user.email });
    }

    // POST — crea evento (solo admin)
    if (req.method === 'POST') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Solo l\'admin può creare eventi' });
      const { title, description, type, event_date, event_time, permissions } = req.body || {};
      if (!title || !event_date) return res.status(400).json({ error: 'Titolo e data obbligatori' });
      await sql`
        INSERT INTO events (title, description, type, event_date, event_time, permissions, read_by, created_by)
        VALUES (${title}, ${description||''}, ${type||'avviso'}, ${event_date}, ${event_time||''}, ${permissions||'all'}, ${'[]'}, ${user.email})
      `;
      return res.status(200).json({ success: true });
    }

    // PUT — modifica evento (admin) oppure segna come letto (qualsiasi utente)
    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID mancante' });
      const body = req.body || {};

      if (body.action === 'read') {
        const row = await sql`SELECT read_by FROM events WHERE id = ${id}`;
        if (row.rows.length === 0) return res.status(404).json({ error: 'Evento non trovato' });
        let readBy = [];
        try { readBy = JSON.parse(row.rows[0].read_by || '[]'); } catch {}
        if (!readBy.includes(user.email)) {
          readBy.push(user.email);
          await sql`UPDATE events SET read_by = ${JSON.stringify(readBy)} WHERE id = ${id}`;
        }
        return res.status(200).json({ success: true });
      }

      if (user.role !== 'admin') return res.status(403).json({ error: 'Solo l\'admin può modificare eventi' });
      const { title, description, type, event_date, event_time, permissions } = body;
      await sql`
        UPDATE events SET
          title = ${title}, description = ${description||''}, type = ${type||'avviso'},
          event_date = ${event_date}, event_time = ${event_time||''}, permissions = ${permissions||'all'}
        WHERE id = ${id}
      `;
      return res.status(200).json({ success: true });
    }

    // DELETE — elimina evento (solo admin)
    if (req.method === 'DELETE') {
      if (user.role !== 'admin') return res.status(403).json({ error: 'Solo l\'admin può eliminare eventi' });
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID mancante' });
      await sql`DELETE FROM events WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
