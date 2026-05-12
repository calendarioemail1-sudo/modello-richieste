import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Crea la tabella se non esiste
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

    const {
      numero_proposta, tipo_richiesta, nome, cognome, targa, tipo_veicolo,
      email_assicurato, telefono, compagnia_provenienza, frazionamento,
      sconto_richiesto, premio_rca, totale_scontato_rca, preventivo_totale,
      garanzie, note, canale_invio
    } = req.body;

    await sql`
      INSERT INTO submissions (
        numero_proposta, tipo_richiesta, nome, cognome, targa, tipo_veicolo,
        email_assicurato, telefono, compagnia_provenienza, frazionamento,
        sconto_richiesto, premio_rca, totale_scontato_rca, preventivo_totale,
        garanzie, note, canale_invio
      ) VALUES (
        ${numero_proposta}, ${tipo_richiesta}, ${nome}, ${cognome}, ${targa}, ${tipo_veicolo},
        ${email_assicurato}, ${telefono}, ${compagnia_provenienza}, ${frazionamento},
        ${sconto_richiesto}, ${premio_rca}, ${totale_scontato_rca}, ${preventivo_totale},
        ${garanzie}, ${note}, ${canale_invio}
      )
    `;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Errore salvataggio:', err);
    return res.status(500).json({ error: 'Errore nel salvataggio', detail: err.message });
  }
}
