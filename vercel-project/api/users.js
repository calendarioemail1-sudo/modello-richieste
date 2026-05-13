import { sql } from '@vercel/postgres';
import { hashPassword, verifyToken } from './auth.js';

const ADMIN_EMAIL = 'giordass@libero.it';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Accesso negato' });

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS codice TEXT DEFAULT ''`;

    // GET — lista utenti
    if (req.method === 'GET') {
      const result = await sql`SELECT id, email, role, nome, codice, created_at FROM users ORDER BY created_at ASC`;
      return res.status(200).json({ users: result.rows });
    }

    // POST — modifica utente
    if (req.method === 'POST') {
      const { email, nome, codice, password } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email obbligatoria' });
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Utente non trovato' });
      if (password && password.trim().length > 0) {
        if (password.trim().length < 6) return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
        await sql`UPDATE users SET nome = ${nome || ''}, codice = ${(codice || '').toUpperCase()}, password_hash = ${hashPassword(password.trim())} WHERE email = ${email}`;
      } else {
        await sql`UPDATE users SET nome = ${nome || ''}, codice = ${(codice || '').toUpperCase()} WHERE email = ${email}`;
      }
      return res.status(200).json({ success: true });
    }

    // DELETE — elimina utente
    if (req.method === 'DELETE') {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email mancante' });
      if (email === ADMIN_EMAIL) return res.status(400).json({ error: 'Non puoi eliminare l\'account admin principale.' });
      await sql`DELETE FROM users WHERE email = ${email}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
