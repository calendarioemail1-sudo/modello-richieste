import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
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

    const { rows } = await sql`
      SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500
    `;

    return res.status(200).json({ submissions: rows });
  } catch (err) {
    console.error('Errore lettura:', err);
    return res.status(500).json({ error: 'Errore nella lettura', detail: err.message });
  }
}
