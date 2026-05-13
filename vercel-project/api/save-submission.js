import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        submitted_by TEXT DEFAULT '',
        numero_proposta TEXT,
        tipo_richiesta TEXT,
        nome TEXT,
        cognome TEXT,
        targa TEXT,
        tipo_veicolo TEXT,
        email_assicurato TEXT,
        telefono TEXT,
        compagnia_provenienza TEXT,
        frazionamento TEXT,
        sconto_richiesto TEXT,
        premio_rca TEXT,
        totale_scontato_rca TEXT,
        preventivo_totale TEXT,
        garanzie TEXT,
        note TEXT,
        canale_invio TEXT
      )
    `;

    await sql`
      ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT ''
    `;

    const body = req.body || {};
    const {
      numero_proposta, tipo_richiesta, nome, cognome, targa, tipo_veicolo,
      email_assicurato, telefono, compagnia_provenienza, frazionamento,
      sconto_richiesto, premio_rca, totale_scontato_rca, preventivo_totale,
      garanzie, note, canale_invio
    } = body;

    await sql`
      INSERT INTO submissions (
        submitted_by, numero_proposta, tipo_richiesta, nome, cognome, targa, tipo_veicolo,
        email_assicurato, telefono, compagnia_provenienza, frazionamento,
        sconto_richiesto, premio_rca, totale_scontato_rca, preventivo_totale,
        garanzie, note, canale_invio
      ) VALUES (
        ${user.email}, ${numero_proposta || ''}, ${tipo_richiesta || ''}, ${nome || ''}, ${cognome || ''},
        ${targa || ''}, ${tipo_veicolo || ''}, ${email_assicurato || ''}, ${telefono || ''},
        ${compagnia_provenienza || ''}, ${frazionamento || ''}, ${sconto_richiesto || ''},
        ${premio_rca || ''}, ${totale_scontato_rca || ''}, ${preventivo_totale || ''},
        ${garanzie || ''}, ${note || ''}, ${canale_invio || ''}
      )
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Errore salvataggio:', err);
    return res.status(500).json({ error: err.message });
  }
}
