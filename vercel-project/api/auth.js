import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';

const ADMIN_EMAIL = 'giordass@libero.it';
const ADMIN_PASSWORD = 'gray8937@';
const SECRET = 'gv_secret_k9x2p1m4n7q3r8s5';

export function hashPassword(password) {
  return createHash('sha256').update(password + SECRET).digest('hex');
}

export function makeToken(email, role) {
  const sig = createHash('sha256').update(email + ':' + role + ':' + SECRET).digest('hex');
  return Buffer.from(email + ':' + role).toString('base64') + '.' + sig;
}

export function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const [email, role] = decoded.split(':');
    const expected = createHash('sha256').update(email + ':' + role + ':' + SECRET).digest('hex');
    if (sig !== expected) return null;
    return { email, role };
  } catch {
    return null;
  }
}

async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      nome TEXT DEFAULT ''
    )
  `;
  const admin = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL}`;
  if (admin.rows.length === 0) {
    await sql`
      INSERT INTO users (email, password_hash, role, nome)
      VALUES (${ADMIN_EMAIL}, ${hashPassword(ADMIN_PASSWORD)}, 'admin', 'Admin')
    `;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureUsersTable();

    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'Dati mancanti' });

    const passwordHash = hashPassword(password);
    const result = await sql`
      SELECT email, role, nome FROM users WHERE email = ${email} AND password_hash = ${passwordHash}
    `;

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }

    const user = result.rows[0];
    const token = makeToken(user.email, user.role);
    return res.status(200).json({ success: true, token, role: user.role, email: user.email, nome: user.nome });
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
