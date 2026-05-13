import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Solo gli admin possono modificare file' });

  const { id } = req.query;
  const { name, permissions } = req.body || {};
  if (!id) return res.status(400).json({ error: 'ID mancante' });

  try {
    if (name !== undefined && permissions !== undefined) {
      await sql`UPDATE files SET name = ${name}, permissions = ${permissions} WHERE id = ${id}`;
    } else if (name !== undefined) {
      await sql`UPDATE files SET name = ${name} WHERE id = ${id}`;
    } else if (permissions !== undefined) {
      await sql`UPDATE files SET permissions = ${permissions} WHERE id = ${id}`;
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({ error: err.message });
  }
}
