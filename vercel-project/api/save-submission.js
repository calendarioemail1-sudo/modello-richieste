import { sql } from '@vercel/postgres';
import { verifyToken } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = verifyToken((req.headers['authorization'] || '').replace('Bearer ', '').trim());
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        submitted_by TEXT DEFAULT '',
        operator_code TEXT DEFAULT '',
        numero_proposta TEXT, tipo_richiesta TEXT,
        nome TEXT, cognome TEXT, targa TEXT, tipo_veicolo TEXT,
        email_assicurato TEXT, telefono TEXT,
        compagnia_provenienza TEXT, frazionamento TEXT,
        sconto_richiesto TEXT, premio_rca TEXT,
        totale_scontato_rca TEXT, preventivo_totale TEXT,
        garanzie TEXT, note TEXT, canale_invio TEXT
      )
    `;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS operator_code TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cointestato TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sinistri TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS provenienza_attestato TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tipo_guida TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS scadenza_vecchia_polizza TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS data_effetto TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS totale_lordo_pass TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sconto_pass TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS premio_altre_garanzie TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS importo_imposte_ssn TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS garanzie_infortuni TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS premio_casa_easy TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS preventivo_precedente TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS documenti TEXT DEFAULT ''`;
    await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS firma_sub_agente TEXT DEFAULT ''`;

    const b = req.body || {};
    await sql`
      INSERT INTO submissions (
        submitted_by, operator_code,
        numero_proposta, tipo_richiesta, nome, cognome, targa, tipo_veicolo,
        email_assicurato, telefono, compagnia_provenienza, frazionamento,
        sconto_richiesto, premio_rca, totale_scontato_rca, preventivo_totale,
        garanzie, note, canale_invio,
        cointestato, sinistri, provenienza_attestato,
        tipo_guida, scadenza_vecchia_polizza, data_effetto,
        totale_lordo_pass, sconto_pass,
        premio_altre_garanzie, importo_imposte_ssn, garanzie_infortuni,
        premio_casa_easy, preventivo_precedente, documenti, firma_sub_agente
      ) VALUES (
        ${user.email}, ${b.operator_code || ''},
        ${b.numero_proposta||''}, ${b.tipo_richiesta||''}, ${b.nome||''}, ${b.cognome||''},
        ${b.targa||''}, ${b.tipo_veicolo||''}, ${b.email_assicurato||''}, ${b.telefono||''},
        ${b.compagnia_provenienza||''}, ${b.frazionamento||''}, ${b.sconto_richiesto||''},
        ${b.premio_rca||''}, ${b.totale_scontato_rca||''}, ${b.preventivo_totale||''},
        ${b.garanzie||''}, ${b.note||''}, ${b.canale_invio||''},
        ${b.cointestato||''}, ${b.sinistri||''}, ${b.provenienza_attestato||''},
        ${b.tipo_guida||''}, ${b.scadenza_vecchia_polizza||''}, ${b.data_effetto||''},
        ${b.totale_lordo_pass||''}, ${b.sconto_pass||''},
        ${b.premio_altre_garanzie||''}, ${b.importo_imposte_ssn||''}, ${b.garanzie_infortuni||''},
        ${b.premio_casa_easy||''}, ${b.preventivo_precedente||''}, ${b.documenti||''}, ${b.firma_sub_agente||''}
      )
    `;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: err.message });
  }
}
