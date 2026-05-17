// Gera a base de dados pré-carregada (jogadores + clubes) a partir dos CSV
// de origem em data/source/. Saída: public/data/scouting-db.json
//
//   node scripts/build-scouting-db.mjs
//
// Corre isto sempre que os CSV de origem forem actualizados.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// CSV parser que respeita aspas e aspas duplas escapadas ("").
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) { row.push(field); rows.push(row); }
      row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toObjects(rows) {
  const header = rows[0];
  return rows.slice(1).filter(r => r.length > 1).map(r => {
    const o = {};
    header.forEach((h, i) => { o[h.trim()] = (r[i] ?? "").trim(); });
    return o;
  });
}

// Posição do CSV (rótulo PT) -> código de posição do modo Sénior do S³.
const POS_MAP = {
  "Guarda-Redes": "GR",
  "Defesa Central": "DC",
  "Defesa": "DC",
  "Lateral Direito": "LD",
  "Lateral Esquerdo": "LE",
  "Médio Defensivo": "MD",
  "Médio Centro": "MC",
  "Médio": "MC",
  "Médio Direito": "MC",
  "Médio Esquerdo": "MC",
  "Médio Ofensivo": "MO",
  "Extremo Direito": "ED",
  "Extremo Esquerdo": "EE",
  "Ponta de Lança": "PL",
  "Avançado": "PL",
  "Segundo Avançado": "SA",
};

// "30/06/2028" -> "2028-06-30" (input type=date). Vazio se inválido.
function toISODate(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

const playersCsv = readFileSync(join(ROOT, "data/source/jogadores.csv"), "utf8");
const clubsCsv = readFileSync(join(ROOT, "data/source/clubes.csv"), "utf8");

const players = toObjects(parseCSV(playersCsv)).map(p => ({
  id: p.player_id,
  nome: p.name,
  posLabel: p.position,
  pos: POS_MAP[p.position] || "MC",
  idade: p.age ? Number(p.age) : null,
  nacionalidade: p.primary_nationality,
  nacionalidades: p.nationalities,
  numero: p.jersey_number,
  contratoAte: toISODate(p.contract_until),
  valorEur: p.market_value_eur ? Number(p.market_value_eur) : 0,
  valorTexto: p.market_value_text,
  clubeId: p.club_id,
  clube: p.club_name,
  competicao: p.competition_name,
  tier: p.tier ? Number(p.tier) : null,
  // Coluna opcional no CSV (photo_url / foto_url / photo). Vazio = usa iniciais.
  fotoUrl: (p.photo_url || p.foto_url || p.photo || "").trim(),
})).sort((a, b) => (b.valorEur - a.valorEur) || a.nome.localeCompare(b.nome, "pt"));

const clubs = toObjects(parseCSV(clubsCsv)).map(c => ({
  id: c.club_id,
  nome: c.club_name,
  competicao: c.competition,
  tier: c.tier ? Number(c.tier) : null,
  nJogadores: c.n_players ? Number(c.n_players) : null,
  valorTotalEur: c.total_market_value_eur ? Number(c.total_market_value_eur) : 0,
  idadeMedia: c.avg_age ? Number(c.avg_age) : null,
})).sort((a, b) => (b.valorTotalEur - a.valorTotalEur) || a.nome.localeCompare(b.nome, "pt"));

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  players,
  clubs,
};

const dest = join(ROOT, "public/data/scouting-db.json");
writeFileSync(dest, JSON.stringify(out));
console.log(`OK: ${players.length} jogadores, ${clubs.length} clubes -> public/data/scouting-db.json`);
