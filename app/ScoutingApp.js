"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { createClient } from "../lib/supabase/client";

const KEY = "sportrail_scouting_v3";
const KEY_V2 = "sportrail_scouting_v2";

// ─── FORMAÇÃO: 15 posições detalhadas (avaliação por atributos 0-10) ─────────
const FORMACAO_POSITIONS = [
  { code: "GR",  label: "Guarda-Redes",             attrBase: "GR", x: 0.5,  y: 0.92 },
  { code: "DC",  label: "Defesa Central",           attrBase: "DC", x: 0.5,  y: 0.78 },
  { code: "DCD", label: "Defesa Central Direito",   attrBase: "DC", x: 0.65, y: 0.78 },
  { code: "DCE", label: "Defesa Central Esquerdo",  attrBase: "DC", x: 0.35, y: 0.78 },
  { code: "LD",  label: "Lateral Direito",          attrBase: "LT", x: 0.88, y: 0.72 },
  { code: "LE",  label: "Lateral Esquerdo",         attrBase: "LT", x: 0.12, y: 0.72 },
  { code: "MD",  label: "Médio Defensivo",          attrBase: "MD", x: 0.5,  y: 0.60 },
  { code: "MC",  label: "Médio Centro",             attrBase: "MC", x: 0.5,  y: 0.48 },
  { code: "MCD", label: "Médio Centro Direito",     attrBase: "MC", x: 0.64, y: 0.48 },
  { code: "MCE", label: "Médio Centro Esquerdo",    attrBase: "MC", x: 0.36, y: 0.48 },
  { code: "MO",  label: "Médio Ofensivo",           attrBase: "MO", x: 0.5,  y: 0.36 },
  { code: "ED",  label: "Extremo Direito",          attrBase: "EX", x: 0.86, y: 0.26 },
  { code: "EE",  label: "Extremo Esquerdo",         attrBase: "EX", x: 0.14, y: 0.26 },
  { code: "SP",  label: "Segundo Avançado",         attrBase: "SP", x: 0.5,  y: 0.20 },
  { code: "PL",  label: "Ponta de Lança",           attrBase: "PL", x: 0.5,  y: 0.09 }
];

// ─── SÉNIOR: 11 posições × 4 categorias × 7 itens = 28 parâmetros ─────────────
const SENIOR_POSITIONS = [
  { code: "GR", label: "Guarda-Redes",      x: 0.50, y: 0.92 },
  { code: "DC", label: "Defesa Central",    x: 0.50, y: 0.78 },
  { code: "LD", label: "Lateral Direito",   x: 0.88, y: 0.70 },
  { code: "LE", label: "Lateral Esquerdo",  x: 0.12, y: 0.70 },
  { code: "MD", label: "Médio Defensivo",   x: 0.50, y: 0.60 },
  { code: "MC", label: "Médio Centro",      x: 0.50, y: 0.48 },
  { code: "MO", label: "Médio Ofensivo",    x: 0.50, y: 0.36 },
  { code: "ED", label: "Extremo Direito",   x: 0.88, y: 0.22 },
  { code: "EE", label: "Extremo Esquerdo",  x: 0.12, y: 0.22 },
  { code: "SA", label: "Segundo Avançado",  x: 0.32, y: 0.12 },
  { code: "PL", label: "Ponta de Lança",    x: 0.68, y: 0.12 },
];

// Formação: médias de referência por posição (para overlay radar)
const POS_AVG = {
  "GR": { "Jogo de pés": 6, "1v1": 7, "Jogo aéreo": 7, "Reflexos": 7, "Posicionamento": 7, "Comunicação": 6 },
  "DC": { "Jogo aéreo": 7, "Marcação": 7, "Antecipação": 6, "Passe curto": 6, "Passe longo": 5, "Agressividade": 7, "Posicionamento": 7 },
  "LT": { "1v1 defensivo": 6, "Cruzamento": 6, "Apoio ofensivo": 6, "Velocidade": 7, "Resistência": 7, "Passe": 6 },
  "MD": { "Recuperação": 7, "Passe curto": 7, "Leitura de jogo": 7, "Cobertura": 6, "Disciplina tática": 7 },
  "MC": { "Passe curto": 7, "Passe longo": 6, "Visão de jogo": 6, "Condução": 6, "Recuperação": 6, "Remate": 5 },
  "MO": { "Passe decisivo": 6, "Remate": 6, "Criatividade": 6, "Desmarcação": 6, "1v1 ofensivo": 6, "Condução": 6 },
  "EX": { "1v1 ofensivo": 7, "Velocidade": 7, "Cruzamento": 6, "Remate": 6, "Desmarcação": 6, "Finalização": 6 },
  "SP": { "Movimento entrelinhas": 6, "Passe decisivo": 6, "Finalização": 6, "1v1 ofensivo": 6, "Desmarcação": 6, "Associação": 6 },
  "PL": { "Finalização": 7, "Desmarcação": 6, "Jogo de costas": 6, "Jogo aéreo": 6, "Pressing": 6, "Movimento sem bola": 6 }
};

const POS_ATTRS = {
  "GR": ["Jogo de pés","1v1","Jogo aéreo","Reflexos","Posicionamento","Comunicação"],
  "DC": ["Jogo aéreo","Marcação","Antecipação","Passe curto","Passe longo","Agressividade","Posicionamento"],
  "LT": ["1v1 defensivo","Cruzamento","Apoio ofensivo","Velocidade","Resistência","Passe"],
  "MD": ["Recuperação","Passe curto","Leitura de jogo","Cobertura","Disciplina tática"],
  "MC": ["Passe curto","Passe longo","Visão de jogo","Condução","Recuperação","Remate"],
  "MO": ["Passe decisivo","Remate","Criatividade","Desmarcação","1v1 ofensivo","Condução"],
  "EX": ["1v1 ofensivo","Velocidade","Cruzamento","Remate","Desmarcação","Finalização"],
  "SP": ["Movimento entrelinhas","Passe decisivo","Finalização","1v1 ofensivo","Desmarcação","Associação"],
  "PL": ["Finalização","Desmarcação","Jogo de costas","Jogo aéreo","Pressing","Movimento sem bola"]
};

const getFormacaoPosMeta = (code) => FORMACAO_POSITIONS.find(p => p.code === code);
const getPosMeta        = (code) => SENIOR_POSITIONS.find(p => p.code === code);
const getAttrsForPos = (code) => {
  const meta = getFormacaoPosMeta(code);
  return POS_ATTRS[meta?.attrBase] || POS_ATTRS["MC"];
};

const FORMACAO_DIM = ["Técnica","Tática","Física","Mental"];
// Ferramenta dedicada a futebol sénior. Modo "Formação" escondido na UI
// (código preservado). Voltar a true para reativar.
const FORMACAO_ENABLED = false;
const YOUTH_DIM  = ["Técnica individual","Compreensão de jogo","Condição física","Atitude competitiva","Aprendizagem","Projeção"];
const YOUTH_ATTR = ["Controlo orientado","Passe","Condução","1v1","Finalização","Leitura de jogo","Tomada de decisão","Velocidade","Resistência","Liderança","Resiliência","Disciplina"];

const DECISIONS = [
  { id: "contratar",    label: "CONTRATAR",     color: "#16a34a" },
  { id: "acompanhar",  label: "ACOMPANHAR",     color: "#eab308" },
  { id: "sem_interesse",label: "SEM INTERESSE", color: "#C46868" }
];

// ─── SÉNIOR: parâmetros por posição (4 categorias × 7 itens) ─────────────────
const _ltCats = {
  tecnicos:     { label: "TÉCNICOS",      items: ["Condução / transporte","Índice técnico","Cruzamento","Drible / 1x1 ofensivo","Segurança na posse","Sob pressão","Jogo aéreo"] },
  tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo / Decisão","Decisão último terço","Marcação","1x1 defensivo","Duelos","Encurtamento espaços","Posicionamento"] },
  fisicos:      { label: "FÍSICOS",       items: ["Aceleração c/ bola","Aceleração s/ bola","Velocidade","Agilidade","Resistência","Robustez física","Intensidade"] },
  personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Comunicação","Controlo emocional","Concentração","Inteligência de jogo","Polivalência","Margem de evolução"] }
};
const _exCats = {
  tecnicos:     { label: "TÉCNICOS",      items: ["Relação com bola","Condução / transporte","Drible / 1x1 ofensivo","Criatividade","Último passe","Cruzamento","Remate"] },
  tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo / Decisão","Chegada zonas finalização","Aceleração de jogo","Movimentação sem bola","Jogo entre linhas","Reacção à perda","Apoio defensivo"] },
  fisicos:      { label: "FÍSICOS",       items: ["Velocidade","Potência","Resistência","Agilidade","Coordenação","Aceleração","Intensidade de jogo"] },
  personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Agressividade competitiva","Controlo emocional","Concentração","Inteligência de jogo","Polivalência","Margem de evolução"] }
};

const SENIOR_CATS = {
  GR: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Jogo com os pés","Situação de 1x1","Distribuição","Entre os postes","Saídas a cruzamento","Técnica de mãos","Reposição mão"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo","Posicionamento","Controlo profundidade","Comunicação","Organização defensiva","Saídas altas","Timing"] },
    fisicos:      { label: "FÍSICOS",       items: ["Agilidade","Reflexos","Velocidade","Estatura","Impulsão","Envergadura","Coordenação"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Comunicação","Controlo emocional","Concentração","Inteligência de jogo","Coragem","Margem de evolução"] }
  },
  DC: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Índice técnico","Passe longo / variação","Condução / transporte","Jogo aéreo ofensivo","Primeiro passe","Sob pressão","Lançamento longo"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo / Decisão","Posicionamento defensivo","Marcação","1x1 defensivo","Cobertura / Compensação","Controlo profundidade","Jogo aéreo defensivo"] },
    fisicos:      { label: "FÍSICOS",       items: ["Aceleração","Robustez nos duelos","Velocidade","Agilidade","Resistência","Estatura","Impulsão"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Comunicação","Controlo emocional","Concentração","Agressividade competitiva","Coragem","Margem de evolução"] }
  },
  LT: _ltCats, LD: _ltCats, LE: _ltCats,
  MD: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Recuperação de bola","Passe curto","Passe longo","Condução sob pressão","Primeiros toques","Jogo aéreo","Segurança na posse"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo","Cobertura / Compensação","Pressing","Posicionamento","Disciplina tática","Encurtamento","Duelos defensivos"] },
    fisicos:      { label: "FÍSICOS",       items: ["Robustez","Resistência","Velocidade","Agilidade","Intensidade","Aceleração","Estatura"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Comunicação","Concentração","Agressividade competitiva","Controlo emocional","Disciplina","Margem de evolução"] }
  },
  MC: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Índice técnico","Segurança em posse","Passe longo / variação","Condução / transporte","Drible","Remate","Jogo aéreo"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo / Decisão","Encurtamento","Dinâmica","Criatividade","Duelos / pressão","Visão de jogo","Movimentação s/ bola"] },
    fisicos:      { label: "FÍSICOS",       items: ["Aceleração","Robustez nos duelos","Velocidade","Agilidade","Resistência","Estatura","Intensidade"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Comunicação","Controlo emocional","Concentração","Assumir jogo","Agressividade competitiva","Margem de evolução"] }
  },
  MO: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Relação com bola","Remate","Último passe","Condução / transporte","Drible / 1vs1","Tomada de decisão","Dinâmica apoio/rutura"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Reação à perda","Encurtamento espaços","Duelos individuais","1x1 defensivo","Capacidade pressão","Apoio defensivo","Jogo aéreo"] },
    fisicos:      { label: "FÍSICOS",       items: ["Aceleração","Robustez nos duelos","Velocidade","Agilidade","Resistência","Estatura","Impulsão"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Comunicação","Controlo emocional","Instinto matador","Trabalho em equipa","Agressividade competitiva","Margem de evolução"] }
  },
  EX: _exCats, ED: _exCats, EE: _exCats,
  SA: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Relação com bola","Remate","Último passe / Assistência","Condução / transporte","Drible / 1x1","Finalização","Associação"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo / Decisão","Movimento entrelinhas","Dinâmica apoio / rutura","Combinação com PL","Chegada à área","Mobilidade ofensiva","Reação à perda"] },
    fisicos:      { label: "FÍSICOS",       items: ["Aceleração","Agilidade","Velocidade","Resistência","Robustez","Estatura","Intensidade de jogo"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Agressividade competitiva","Controlo emocional","Instinto matador","Inteligência de jogo","Concentração","Margem de evolução"] }
  },
  PL: {
    tecnicos:     { label: "TÉCNICOS",      items: ["Índice técnico","Condução / transporte","Remate","Espontaneidade finalização","Jogo aéreo finalizar","Eficácia finalização","Duelos aéreos"] },
    tacticos:     { label: "TÁCTICOS",      items: ["Leitura de jogo / Decisão","Velocidade de execução","Dinâmica apoio / ruptura","Criatividade","Movimentação na área","Jogo entre linhas","Capacidade de pressão"] },
    fisicos:      { label: "FÍSICOS",       items: ["Aceleração","Robustez física","Velocidade","Agilidade","Resistência","Estatura","Intensidade de jogo"] },
    personalidade:{ label: "PERSONALIDADE", items: ["Liderança","Agressividade competitiva","Controlo emocional","Concentração","Inteligência de jogo","Instinto matador","Margem de evolução"] }
  }
};

const CLASSIFICACAO_OPTIONS = ["CLASSE MUNDIAL","ELITE","ACIMA DA MÉDIA","RENTÁVEL","MÉDIO","ABAIXO DA MÉDIA","INSUFICIENTE"];
const DECISAO_SENIOR = ["CONTRATAR JÁ","CONTRATAR","MONITORIZAR","REJEITAR"];
const TAP_VALS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

// Traffic-light colour helpers (semáforo)
// 1–5 scale: green ≥4 (80%), yellow ≥2.5 (50%), red below
const tapColor = (v) => {
  if (!v) return "#383D5C";
  if (v >= 4) return "#22c55e";
  if (v >= 2.5) return "#eab308";
  return "#C46868";
};
// 0–10 scale: green ≥8 (80%), yellow ≥5 (50%), red below
const sliderColor = (v) => {
  if (v >= 8) return "#22c55e";
  if (v >= 5) return "#eab308";
  if (v > 0) return "#C46868";
  return "#383D5C";
};

const calcAutoNotaSenior = (cats, pos) => {
  const posCats = SENIOR_CATS[pos];
  if (!posCats) return 0;
  const vals = Object.keys(posCats).flatMap(ck =>
    posCats[ck].items.map((_, i) => Number(cats[`${ck}_${i}`] || 0))
  ).filter(v => v > 0);
  if (!vals.length) return 0;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
};

// v11: Theme system (dark/light)
const THEMES = {
  dark: {
    bg: "#0B0D1A",
    panel: "#161929",
    panelAlt: "#1F2338",
    border: "#2A2E48",
    borderSoft: "#383D5C",
    text: "#E8EAF2",
    textMuted: "#A4A8C0",
    textDim: "#5E6383",
    textFaint: "#5E6383",
    red: "#DDB85C",
    redHover: "#F0CD7A",
    green: "#22c55e",
    yellow: "#eab308",
    redSoft: "#C46868",
    inputBg: "#0B0D1A",
    inputBorder: "#2A2E48",
    sidebarBg: "#161929",
    headerBg: "rgba(11,13,26,0.95)",
    shadow: "rgba(0,0,0,0.5)",
    isDark: true
  },
  light: {
    bg: "#f5f5f7",
    panel: "#ffffff",
    panelAlt: "#fafafa",
    border: "#d1d1d6",
    borderSoft: "#e5e5ea",
    text: "#1F2338",
    textMuted: "#5E6383",
    textDim: "#5E6383",
    textFaint: "#A4A8C0",
    red: "#B89545",
    redHover: "#B89545",
    green: "#16a34a",
    yellow: "#ca8a04",
    redSoft: "#C46868",
    inputBg: "#ffffff",
    inputBorder: "#d1d1d6",
    sidebarBg: "#ffffff",
    headerBg: "rgba(245,245,247,0.95)",
    shadow: "rgba(0,0,0,0.08)",
    isDark: false
  }
};
// Legacy alias kept for backward-compat during refactor
const S = THEMES.dark;

const isUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `r_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

const emptyReport = (mode) => ({
  id: newId(),
  createdAt: Date.now(),
  mode, foto: "", nome: "", dataNasc: "", naturalidade: "", nacionalidade: "",
  clube: "", contratoAte: "", percurso: "", agente: "", bio: "", db_player_id: "",
  pos: "MC", posSec: "", pe: "Direito", altura: "", peso: "",
  data: "", comp: "", adv: "", resultado: "", min: "", sistema: "",
  atr: {}, dim: {}, cats: {},
  fortes: ["","",""], lacunas: ["","",""],
  obs: "", parecer: "", decisao: "", nota: 0, potencial: "", rendimento: "", pinned: false,
  golos: "", assists: "", jogos: "",
  classificacao: "RENTÁVEL", avImediata: 3, avMedioPrazo: 3, avLongoPrazo: 4,
  scout: "", dataRel: new Date().toISOString().split("T")[0]
});

const loadLib = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) return res();
  const s = document.createElement("script");
  s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
});

const loadStore = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  try {
    const v2raw = localStorage.getItem(KEY_V2);
    if (v2raw) {
      const v2 = JSON.parse(v2raw);
      const r = { ...emptyReport(v2.mode || "senior"), ...v2, id: newId(), createdAt: Date.now() };
      localStorage.removeItem(KEY_V2);
      return { reports: { [r.id]: r }, activeId: r.id };
    }
  } catch(e) {}
  const r = emptyReport("senior");
  return { reports: { [r.id]: r }, activeId: r.id };
};

const storageUsage = () => {
  try {
    let total = 0;
    for (let k in localStorage) if (localStorage.hasOwnProperty(k)) total += (localStorage[k].length + k.length) * 2;
    return Math.min(100, (total / (5 * 1024 * 1024)) * 100);
  } catch(e) { return 0; }
};

// v7a: helpers
const calcAge = (dataNasc) => {
  if (!dataNasc) return null;
  const d = new Date(dataNasc);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
};

const relativeTime = (ts) => {
  if (!ts) return null;
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? "há 1 hora" : `há ${hrs} horas`;
};

const contractStatus = (contratoAte) => {
  if (!contratoAte) return null;
  const d = new Date(contratoAte);
  if (isNaN(d)) return null;
  const now = new Date();
  const days = Math.round((d - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Expirado", color: "#C46868" };
  if (days < 180) return { label: days + "d", color: "#C46868" };
  if (days < 365) return { label: Math.round(days/30) + "m", color: "#eab308" };
  return { label: (days/365).toFixed(1) + "a", color: "#22c55e" };
};

const calcAutoNota = (atr, dim) => {
  const atrVals = Object.values(atr || {}).filter(v => Number(v) > 0).map(Number);
  const dimVals = Object.values(dim || {}).filter(v => Number(v) > 0).map(Number);
  if (atrVals.length === 0 && dimVals.length === 0) return 0;
  const mAtr = atrVals.length ? atrVals.reduce((a,b)=>a+b,0) / atrVals.length : 0;
  const mDim = dimVals.length ? dimVals.reduce((a,b)=>a+b,0) / dimVals.length : 0;
  if (atrVals.length && dimVals.length) return Number(((mAtr + mDim) / 2).toFixed(1));
  return Number((mAtr || mDim).toFixed(1));
};

// ---------- v4: CSV EXPORT ----------
const csvEscape = (val) => {
  if (val == null) return "";
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const exportReportsToCSV = (reports) => {
  if (!reports.length) { alert("Sem relatórios para exportar."); return; }
  // Collect all unique attr + dim keys across the filtered set
  const allAttrs = new Set();
  const allDims = new Set();
  reports.forEach(r => {
    Object.keys(r.atr || {}).forEach(k => allAttrs.add(k));
    Object.keys(r.dim || {}).forEach(k => allDims.add(k));
  });
  const attrCols = Array.from(allAttrs).sort();
  const dimCols = Array.from(allDims).sort();

  const baseCols = [
    "id","modo","nome","data_nasc","nacionalidade","clube","contrato_ate",
    "posicao","posicao_sec","pe","altura_cm","peso_kg",
    "data_obs","competicao","adversario","resultado","min_observados","sistema",
    "ponto_forte_1","ponto_forte_2","ponto_forte_3",
    "lacuna_1","lacuna_2","lacuna_3",
    "observacoes","parecer","decisao","nota","scout","data_relatorio"
  ];

  const header = [
    ...baseCols,
    ...dimCols.map(d => `dim_${d}`),
    ...attrCols.map(a => `attr_${a}`)
  ];

  const rows = reports.map(r => {
    const base = [
      r.id, r.mode, r.nome, r.dataNasc, r.nacionalidade, r.clube, r.contratoAte,
      r.pos, r.posSec, r.pe, r.altura, r.peso,
      r.data, r.comp, r.adv, r.resultado, r.min, r.sistema,
      r.fortes?.[0] || "", r.fortes?.[1] || "", r.fortes?.[2] || "",
      r.lacunas?.[0] || "", r.lacunas?.[1] || "", r.lacunas?.[2] || "",
      r.obs, r.parecer, r.decisao, r.nota, r.scout, r.dataRel
    ];
    const dims = dimCols.map(d => r.dim?.[d] ?? "");
    const attrs = attrCols.map(a => r.atr?.[a] ?? "");
    return [...base, ...dims, ...attrs].map(csvEscape).join(",");
  });

  const csv = "\ufeff" + [header.map(csvEscape).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sportrail-scouting-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------- v4: JSON BACKUP ----------
const exportBackup = (store) => {
  const payload = {
    app: "sportrail-scouting",
    version: "v5",
    exportedAt: new Date().toISOString(),
    store
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sportrail-backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Builder({ meshParams = null }) {
  const [store, setStore] = useState(loadStore);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [fotoLink, setFotoLink] = useState("");
  const [fotoBusy, setFotoBusy] = useState(false);
  const [fotoErr, setFotoErr] = useState("");
  const [filterDec, setFilterDec] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompareView, setShowCompareView] = useState(false);
  const [showPosAvg, setShowPosAvg] = useState(false); // unused — kept for radarData compat
  const [playerDbOpen, setPlayerDbOpen] = useState(false);
  const [playerDb, setPlayerDb] = useState(null); // { players, clubs } | null
  const [playerDbLoading, setPlayerDbLoading] = useState(false);
  const [playerDbError, setPlayerDbError] = useState(false);
  const [dbQuery, setDbQuery] = useState("");
  const shareRef = useRef();
  const shareSquareRef = useRef();
  const shareVerticalRef = useRef();
  const shareStoriesRef = useRef();
  const importRef = useRef();
  const [sbUser, setSbUser] = useState(null);
  const [isTrainer, setIsTrainer] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const [showValidation, setShowValidation] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('sportrail_theme') !== 'light'; } catch { return true; }
  });
  // Shadow module-level S with reactive theme
  const S = isDark ? THEMES.dark : THEMES.light;
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('sportrail_theme', next ? 'dark' : 'light'); } catch {}
  };
  const syncTimerRef = useRef(null);
  const prevStoreRef = useRef(null);
  const [undoToast, setUndoToast] = useState(null);
  const [sortBy, setSortBy] = useState("date_desc");
  const [saveToast, setSaveToast] = useState(false);
  const undoTimerRef = useRef(null);
  const saveToastTimerRef = useRef(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [, forceTickTime] = useState(0);

  const r = store.reports[store.activeId];

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch(e) { alert("Erro a guardar — localStorage pode estar cheio. Exporta backup."); } }, [store]);
  useEffect(() => {
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }, []);

  // ── Scouting Mesh deep link: auto-create pre-filled report ────────────────
  // Triggered when opening S³ from Scouting Mesh player detail page via:
  //   ?mesh_id=42&nome=João Silva&clube=Estrela&pos=MC
  // The mesh_player_id field is stored in the report blob and synced to
  // Supabase, allowing Scouting Mesh to query reports by player.
  useEffect(() => {
    if (!meshParams?.meshPlayerId) return;
    // Avoid creating a duplicate if we already have a report for this player
    const existing = Object.values(store.reports).find(
      rep => rep.mesh_player_id === meshParams.meshPlayerId
    );
    if (existing) {
      setStore(s => ({ ...s, activeId: existing.id }));
      return;
    }
    const nr = emptyReport("senior");
    nr.nome  = meshParams.nome  || "";
    nr.clube = meshParams.clube || "";
    if (meshParams.pos) nr.pos = meshParams.pos;
    nr.mesh_player_id = meshParams.meshPlayerId; // stored in Supabase JSONB
    setStore(s => ({ reports: { ...s.reports, [nr.id]: nr }, activeId: nr.id }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase: identify user + initial load ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // not authenticated — localStorage only
        setSbUser(user);

        // Check if user is a trainer (has at least one course assigned)
        const { data: trainerCourses } = await supabase
          .from("course_trainers")
          .select("course_code")
          .eq("trainer_id", user.id)
          .limit(1);
        if (trainerCourses?.length > 0) setIsTrainer(true);

        // Fetch reports from Supabase
        const { data, error } = await supabase
          .from("reports")
          .select("id, data")
          .eq("owner_id", user.id);

        if (error) { console.error("Supabase load error:", error); return; }
        if (!data || data.length === 0) return; // nothing in cloud yet — local wins

        // Merge: Supabase reports take precedence over same-id local versions
        setStore(s => {
          const merged = { ...s.reports };
          data.forEach(row => { merged[row.id] = row.data; });
          // Keep activeId if still valid, else pick first available
          const ids = Object.keys(merged);
          const activeId = merged[s.activeId] ? s.activeId : ids[0];
          return { reports: merged, activeId };
        });
      } catch (err) {
        console.error("Supabase init error:", err);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase: debounced sync on every store change ──────────────────────
  useEffect(() => {
    if (!sbUser) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      try {
        // ── Migrate legacy r_... IDs to UUIDs (Supabase id column is uuid type) ──
        const hasLegacyIds = Object.values(store.reports).some(rep => !isUUID(rep.id));
        if (hasLegacyIds) {
          setStore(s => {
            const migrated = {};
            let newActiveId = s.activeId;
            Object.values(s.reports).forEach(rep => {
              const id = isUUID(rep.id) ? rep.id : newId();
              migrated[id] = { ...rep, id };
              if (s.activeId === rep.id) newActiveId = id;
            });
            return { reports: migrated, activeId: newActiveId };
          });
          return; // next debounce cycle will sync the migrated reports
        }

        const supabase = createClient();
        const prev = prevStoreRef.current;

        // Upsert only reports that changed since last sync
        const changed = Object.values(store.reports).filter(rep => {
          const prevRep = prev?.reports?.[rep.id];
          return !prevRep || JSON.stringify(prevRep) !== JSON.stringify(rep);
        });

        // Delete reports removed since last sync (only UUID IDs — legacy IDs were never in Supabase)
        const deleted = prev
          ? Object.keys(prev.reports).filter(id => !store.reports[id] && isUUID(id))
          : [];

        if (changed.length === 0 && deleted.length === 0) return;

        setSyncStatus("syncing");

        if (changed.length > 0) {
          const course_code   = sbUser.user_metadata?.course_code || null;
          const student_email = sbUser.email || null;
          const { error } = await supabase.from("reports").upsert(
            changed.map(rep => ({ id: rep.id, owner_id: sbUser.id, course_code, student_email, data: rep })),
            { onConflict: "id" }
          );
          if (error) {
            console.error("Supabase upsert error details:", error.code, error.message, error.details, error.hint);
            throw error;
          }
        }

        for (const id of deleted) {
          await supabase.from("reports").delete().eq("id", id).eq("owner_id", sbUser.id);
        }

        prevStoreRef.current = store;
        setSyncStatus("synced");
      } catch (err) {
        console.error("Supabase sync error:", err);
        setSyncStatus("error");
      }
    }, 1500);
  }, [store, sbUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-update nota based on mode: senior uses cats, formação uses atr+dim
  // Only overwrite if new calculation is non-zero (preserves manually-set or legacy nota)
  useEffect(() => {
    const current = store.reports[store.activeId];
    if (!current) return;
    const newNota = current.mode === "senior"
      ? calcAutoNotaSenior(current.cats || {}, current.pos)
      : calcAutoNota(current.atr, current.dim);
    if (newNota > 0 && Number(current.nota) !== newNota) {
      setStore(s => ({ ...s, reports: { ...s.reports, [s.activeId]: { ...s.reports[s.activeId], nota: newNota } } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.activeId, JSON.stringify(store.reports[store.activeId]?.atr), JSON.stringify(store.reports[store.activeId]?.dim), JSON.stringify(store.reports[store.activeId]?.cats)]);

  // Close data menu on outside click
  useEffect(() => {
    const close = () => setDataMenuOpen(false);
    if (dataMenuOpen) {
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }
  }, [dataMenuOpen]);

  // Close share menu on outside click
  useEffect(() => {
    const close = () => setShareMenuOpen(false);
    if (shareMenuOpen) {
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }
  }, [shareMenuOpen]);

  const updateActive = (fields) => setStore(s => ({ ...s, reports: { ...s.reports, [s.activeId]: { ...s.reports[s.activeId], ...fields } } }));
  const u = (f, v) => updateActive({ [f]: v });

  const newReport = () => {
    const nr = emptyReport(r?.mode || "senior");
    nr.scout = r?.scout || "";
    setStore(s => ({ reports: { ...s.reports, [nr.id]: nr }, activeId: nr.id }));
    // Auto-close sidebar on mobile
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  };

  const openPlayerDb = () => {
    setPlayerDbOpen(true);
    if (playerDb || playerDbLoading) return;
    setPlayerDbLoading(true);
    setPlayerDbError(false);
    fetch("/data/scouting-db.json")
      .then(res => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(data => setPlayerDb(data))
      .catch(() => setPlayerDbError(true))
      .finally(() => setPlayerDbLoading(false));
  };

  const buildBio = (p) => {
    const parts = [];
    if (p.idade != null) parts.push(`${p.idade} anos`);
    if (p.posLabel) parts.push(p.posLabel);
    if (p.numero) parts.push(`nº ${p.numero}`);
    if (p.valorTexto) parts.push(`Valor de mercado: ${p.valorTexto}`);
    if (p.competicao) parts.push(`${p.competicao}${p.tier ? ` (Tier ${p.tier})` : ""}`);
    if (p.nacionalidades && p.nacionalidades !== p.nacionalidade)
      parts.push(`Nacionalidades: ${p.nacionalidades.replace(/\|/g, ", ")}`);
    parts.push(`Transfermarkt ID: ${p.id}`);
    return parts.join(" · ");
  };

  const createReportFromDbPlayer = (p) => {
    const existing = Object.values(store.reports).find(rep => rep.db_player_id === p.id);
    if (existing) {
      setStore(s => ({ ...s, activeId: existing.id }));
    } else {
      const nr = emptyReport("senior");
      nr.scout = r?.scout || "";
      nr.nome = p.nome || "";
      nr.nacionalidade = p.nacionalidade || "";
      nr.clube = p.clube || "";
      nr.contratoAte = p.contratoAte || "";
      nr.pos = p.pos || "MC";
      nr.bio = buildBio(p);
      nr.foto = p.fotoUrl || "";
      nr.db_player_id = p.id;
      setStore(s => ({ reports: { ...s.reports, [nr.id]: nr }, activeId: nr.id }));
    }
    setPlayerDbOpen(false);
    setDbQuery("");
    setShowValidation(false);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  };

  const selectReport = (id) => {
    if (compareMode) {
      toggleCompareId(id);
      return;
    }
    setStore(s => ({ ...s, activeId: id }));
    setShowValidation(false);
    // Auto-close sidebar on mobile
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  };

  const toggleCompareId = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) { alert("Máximo 3 jogadores para comparar."); return prev; }
      return [...prev, id];
    });
  };

  const startCompareMode = () => {
    setCompareMode(true);
    setCompareIds([]);
    setShowCompareView(false);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareIds([]);
    setShowCompareView(false);
  };

  const openCompareView = () => {
    if (compareIds.length < 2) { alert("Seleciona pelo menos 2 jogadores."); return; }
    setShowCompareView(true);
  };

  const deleteReport = (id) => {
    const rep = store.reports[id];
    const prevActiveId = store.activeId;
    setStore(s => {
      const nr = { ...s.reports }; delete nr[id];
      const ids = Object.keys(nr);
      if (ids.length === 0) {
        const fresh = emptyReport("senior");
        return { reports: { [fresh.id]: fresh }, activeId: fresh.id };
      }
      const activeId = s.activeId === id ? ids[0] : s.activeId;
      return { reports: nr, activeId };
    });
    setConfirmDelete(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ report: rep, prevActiveId });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  };

  const undoDelete = () => {
    if (!undoToast) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const { report, prevActiveId } = undoToast;
    setStore(s => ({
      ...s,
      reports: { ...s.reports, [report.id]: report },
      activeId: s.reports[prevActiveId] ? prevActiveId : report.id,
    }));
    setUndoToast(null);
  };

  const togglePin = (id) => {
    setStore(s => ({
      ...s,
      reports: { ...s.reports, [id]: { ...s.reports[id], pinned: !s.reports[id]?.pinned } }
    }));
  };

  const duplicateReport = (id) => {
    const rep = store.reports[id];
    if (!rep) return;
    const copy = { ...rep, id: newId(), nome: (rep.nome || "Sem nome") + " (cópia)", createdAt: Date.now() };
    setStore(s => ({ ...s, reports: { ...s.reports, [copy.id]: copy } }));
  };

  const switchMode = (m) => {
    if (m === r.mode) return;
    if (confirm("Mudar de modo limpa a avaliação deste relatório. Continuar?")) {
      updateActive({ mode: m, atr: {}, dim: {}, cats: {}, pos: "MC" });
    }
  };

  // Recorta a imagem (data URL) para 400×400 JPEG centrado.
  const cropToDataUrl = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 400; c.height = 400;
      const ctx = c.getContext("2d");
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("imagem inválida"));
    img.src = src;
  });

  const onPhoto = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => cropToDataUrl(ev.target.result).then(d => u("foto", d)).catch(() => {});
    reader.readAsDataURL(f);
  };

  // Cola o link do jogador (Transfermarkt / zerozero) e busca a foto.
  const fetchFotoFromLink = async () => {
    const link = fotoLink.trim();
    if (!link) return;
    setFotoBusy(true); setFotoErr("");
    try {
      const res = await fetch(`/api/foto?url=${encodeURIComponent(link)}`);
      const data = await res.json();
      if (!res.ok || !data.dataUrl) throw new Error(data.error || "Não foi possível obter a foto.");
      const cropped = await cropToDataUrl(data.dataUrl);
      u("foto", cropped);
      setFotoLink("");
    } catch (err) {
      setFotoErr(err.message || "Erro ao buscar a foto.");
    } finally {
      setFotoBusy(false);
    }
  };

  // ---------- v4: IMPORT JSON ----------
  const onImportFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const incoming = data.store || data;
        if (!incoming.reports) { alert("Ficheiro inválido: estrutura não reconhecida."); return; }
        const incomingCount = Object.keys(incoming.reports).length;
        const choice = confirm(
          `Importar ${incomingCount} relatório(s)?\n\nOK = Unir com os atuais (mantém ambos)\nCancelar = Abortar\n\n(Para SUBSTITUIR tudo, usa a opção no menu depois.)`
        );
        if (!choice) return;
        setStore(s => {
          const merged = { ...s.reports };
          Object.values(incoming.reports).forEach(rep => {
            const newRep = { ...rep, id: newId() };
            merged[newRep.id] = newRep;
          });
          return { ...s, reports: merged };
        });
        alert(`${incomingCount} relatório(s) importado(s).`);
      } catch(err) {
        alert("Erro a ler ficheiro JSON: " + err.message);
      }
    };
    reader.readAsText(f);
  };

  const replaceFromBackup = () => {
    if (!confirm("⚠️ SUBSTITUIR todos os relatórios atuais pelo backup?\n\nIsto vai APAGAR tudo o que tens agora. Garante que tens backup antes.")) return;
    importRef.current?.click();
  };

  // Formação mode: position-specific attrs + 4 dims (0–10 sliders)
  const attrs = r.mode === "formacao" ? getAttrsForPos(r.pos) : YOUTH_ATTR;
  const dims  = r.mode === "formacao" ? FORMACAO_DIM : YOUTH_DIM;
  const posMeta = r.mode === "senior" ? getPosMeta(r.pos) : getFormacaoPosMeta(r.pos);
  const posAvg  = r.mode === "formacao" && posMeta ? (POS_AVG[posMeta.attrBase] || {}) : {};
  const radarData = attrs.map(a => ({ attr: a, v: r.atr[a] || 0, avg: posAvg[a] || 0 }));
  const barData   = dims.map(d => ({ dim: d, v: r.dim[d] || 0 }));
  const media = attrs.length ? (attrs.reduce((s,a)=>s+(r.atr[a]||0),0)/attrs.length).toFixed(1) : "0.0";
  // Senior mode: 4 cats × 7 items (1–5 TapRating)
  const seniorCats = r.mode === "senior" ? (SENIOR_CATS[r.pos] || SENIOR_CATS.MC) : null;
  const autoNota = r.mode === "senior"
    ? calcAutoNotaSenior(r.cats || {}, r.pos)
    : calcAutoNota(r.atr, r.dim);
  // Category averages for senior share cards / PDF
  const catAvgs = r.mode === "senior" && seniorCats
    ? Object.entries(seniorCats).reduce((acc, [ck, cat]) => {
        const vals = cat.items.map((_, i) => Number((r.cats || {})[`${ck}_${i}`] || 0)).filter(v => v > 0);
        acc[ck] = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
        return acc;
      }, {})
    : null;
  const seniorDecColor = r.decisao === "CONTRATAR JÁ" ? "#16a34a" : r.decisao === "CONTRATAR" ? "#22c55e" : r.decisao === "MONITORIZAR" ? "#eab308" : r.decisao === "REJEITAR" ? "#C46868" : null;
  const age = calcAge(r.dataNasc);
  const contract = contractStatus(r.contratoAte);

  const exportPDF = () => {
    const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFLib) return alert("A carregar biblioteca PDF...");
    try {
      generateNativePDF(jsPDFLib, r, attrs, dims, media, autoNota, age, contract, posMeta, decObj);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Erro ao gerar PDF: " + (err?.message || err) + "\n\nAbre a consola (F12) para mais detalhes.");
    }
  };

  const shareCard = async (format = "vertical") => {
    if (!window.html2canvas) return alert("A carregar...");
    let target = shareRef.current;
    let suffix = "card";
    if (format === "square") { target = shareSquareRef.current; suffix = "1080x1080"; }
    else if (format === "vertical") { target = shareVerticalRef.current; suffix = "1080x1350"; }
    else if (format === "stories") { target = shareStoriesRef.current; suffix = "1080x1920"; }
    if (!target) return alert("Card não encontrado");
    const canvas = await window.html2canvas(target, { backgroundColor: S.bg, scale: 2 });
    canvas.toBlob((blob) => {
      const file = new File([blob], `s3-${r.nome || "card"}-${suffix}.png`, { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const filteredReports = useMemo(() => {
    const list = Object.values(store.reports);
    const q = search.toLowerCase().trim();
    return list.filter(rep => {
      if (filterMode !== "all" && rep.mode !== filterMode) return false;
      if (filterDec !== "all" && rep.decisao !== filterDec) return false;
      if (q && !(rep.nome?.toLowerCase().includes(q) || rep.clube?.toLowerCase().includes(q))) return false;
      return true;
    }).sort((a, b) => {
      // Pinned always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      switch (sortBy) {
        case "date_asc": {
          const da = a.dataRel || "0", db = b.dataRel || "0";
          return da !== db ? da.localeCompare(db) : a.createdAt - b.createdAt;
        }
        case "nota_desc": return (Number(b.nota) || 0) - (Number(a.nota) || 0);
        case "nota_asc":  return (Number(a.nota) || 0) - (Number(b.nota) || 0);
        case "nome_az":   return (a.nome || "").localeCompare(b.nome || "", "pt");
        default: { // date_desc
          const da = a.dataRel || "0", db = b.dataRel || "0";
          return db !== da ? db.localeCompare(da) : b.createdAt - a.createdAt;
        }
      }
    });
  }, [store.reports, search, filterMode, filterDec, sortBy]);

  const usage = useMemo(() => storageUsage(), [store]);
  const totalReports = Object.keys(store.reports).length;

  const idFields = { nome: r?.nome?.trim(), clube: r?.clube?.trim() };
  const idValid = !!(idFields.nome && idFields.clube);

  const saveReport = async () => {
    setShowValidation(true);
    if (!idValid) {
      document.getElementById("s3-identification")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!sbUser) return; // local-only: localStorage auto-saves
    setSyncStatus("syncing");
    try {
      const supabase = createClient();
      const course_code = sbUser.user_metadata?.course_code || null;
      const { error } = await supabase.from("reports").upsert(
        [{ id: r.id, owner_id: sbUser.id, course_code, data: r }],
        { onConflict: "id" }
      );
      if (error) throw error;
      setSyncStatus("synced");
    } catch (err) {
      console.error("Save error:", err);
      setSyncStatus("error");
    }
  };

  const inp = { background: S.inputBg, border: `1px solid ${S.border}`, color: S.text, padding: "8px 10px", borderRadius: 6, width: "100%", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" };
  const lbl = { fontSize: 10, textTransform: "uppercase", color: S.textDim, display: "block", marginBottom: 4, letterSpacing: 0.5 };
  const sec = { marginBottom: 28 };
  const h2 = { fontSize: 18, textTransform: "uppercase", letterSpacing: 1, borderLeft: `4px solid ${S.red}`, paddingLeft: 10, marginBottom: 14 };

  const decObj = DECISIONS.find(d => d.id === r.decisao);
  const initials = (name) => (name || "?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const decBadge = (id) => DECISIONS.find(d => d.id === id);

  // ---------- v5: COMPARISON VIEW DATA ----------
  const compareReports = compareIds.map(id => store.reports[id]).filter(Boolean);

  const compareData = useMemo(() => {
    if (!showCompareView || compareReports.length < 2) return null;

    // Collect all unique attrs + dims across selected reports
    const allAttrs = new Set();
    const allDims = new Set();
    compareReports.forEach(rep => {
      Object.keys(rep.atr || {}).forEach(k => { if ((rep.atr[k] || 0) > 0) allAttrs.add(k); });
      Object.keys(rep.dim || {}).forEach(k => { if ((rep.dim[k] || 0) > 0) allDims.add(k); });
    });

    // For each attr/dim, find max value to highlight the winner
    const buildRows = (keys, accessor) => {
      return Array.from(keys).sort().map(k => {
        const values = compareReports.map(rep => Number(accessor(rep)[k] || 0));
        const max = Math.max(...values);
        const min = Math.min(...values);
        return { key: k, values, max, min, hasDiff: max !== min };
      });
    };

    return {
      attrs: buildRows(allAttrs, r => r.atr || {}),
      dims: buildRows(allDims, r => r.dim || {})
    };
  }, [showCompareView, compareReports]);

  const cellColor = (val, max, min, hasDiff) => {
    if (!hasDiff || val === 0) return "#fff";
    if (val === max) return "#22c55e";
    if (val === min) return "#C46868";
    return "#fff";
  };

  return (
    <div className="s3-shell" style={{ background: S.bg, color: S.text, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @media print { .no-print { display: none !important; } }
        .card-hover:hover .del-btn { opacity: 1 !important; }
        .card-hover:hover .dup-btn { opacity: 1 !important; }
        /* Dark date/time picker fix */
        input[type="date"], input[type="time"], input[type="datetime-local"] {
          color-scheme: dark;
          color: #E8EAF2;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(0.9);
          cursor: pointer;
          opacity: 0.8;
        }
        input[type="date"]::-webkit-datetime-edit,
        input[type="date"]::-webkit-datetime-edit-fields-wrapper,
        input[type="date"]::-webkit-datetime-edit-text,
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: #E8EAF2 !important;
        }
        /* Placeholder contrast */
        input::placeholder, textarea::placeholder { color: #5E6383 !important; }
        /* Select arrow for dark mode */
        select { color-scheme: dark; }
      `}</style>

      {/* hidden import input */}
      <input ref={importRef} type="file" accept="application/json,.json" onChange={onImportFile} style={{ display: "none" }} />

      {/* Mobile overlay for sidebar drawer */}
      <div
        className={`s3-sidebar-overlay ${sidebarOpen ? "s3-sidebar-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`s3-sidebar no-print ${sidebarOpen ? "s3-sidebar-open" : ""}`} style={{ background: S.panel, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: S.red, fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>SPORTRAIL</div>
            <div style={{ fontSize: 10, color: S.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Scouting Reports</div>
          </div>
          <button
            onClick={toggleTheme}
            title={isDark ? "Modo claro" : "Modo escuro"}
            style={{ background: "transparent", border: `1px solid ${S.border}`, color: S.textDim, borderRadius: 6, padding: "6px 8px", fontSize: 15, cursor: "pointer", lineHeight: 1 }}
          >{isDark ? "☀" : "☾"}</button>
        </div>

        {isTrainer && (
          <a
            href="/formador"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderBottom: `1px solid ${S.border}`,
              background: "rgba(221,184,92,0.12)", color: "#fff", textDecoration: "none",
              fontSize: 12, fontWeight: 600, letterSpacing: 0.5
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>👨‍🏫</span>
              <span>PAINEL FORMADOR</span>
            </span>
            <span style={{ fontSize: 10, color: S.red, fontWeight: 700 }}>VER TURMA →</span>
          </a>
        )}

        <div style={{ padding: 12, borderBottom: `1px solid ${S.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          {!compareMode ? (
            <>
              <button onClick={newReport} style={{ width: "100%", padding: "10px", background: S.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>+ NOVO RELATÓRIO</button>
              <button onClick={openPlayerDb} style={{ width: "100%", padding: "9px", background: "transparent", color: "#fff", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, cursor: "pointer" }}>🔍 PROCURAR JOGADOR</button>
              <button onClick={startCompareMode} style={{ width: "100%", padding: "9px", background: "transparent", color: "#fff", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, cursor: "pointer" }}>⇄ COMPARAR JOGADORES</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#eab308", textAlign: "center", padding: "4px 0", fontWeight: 600 }}>
                MODO COMPARAÇÃO
              </div>
              <div style={{ fontSize: 10, color: "#A4A8C0", textAlign: "center" }}>
                Seleciona 2 ou 3 jogadores ({compareIds.length}/3)
              </div>
              <button
                onClick={openCompareView}
                disabled={compareIds.length < 2}
                style={{
                  width: "100%", padding: "9px",
                  background: compareIds.length >= 2 ? S.red : "#2A2E48",
                  color: compareIds.length >= 2 ? "#fff" : "#5E6383",
                  border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  cursor: compareIds.length >= 2 ? "pointer" : "not-allowed"
                }}
              >COMPARAR ({compareIds.length})</button>
              <button onClick={exitCompareMode} style={{ width: "100%", padding: "7px", background: "transparent", color: "#A4A8C0", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 10, cursor: "pointer" }}>CANCELAR</button>
            </>
          )}
        </div>

        <div style={{ padding: 12, borderBottom: `1px solid ${S.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <input style={{...inp, fontSize: 12}} placeholder="Pesquisar nome ou clube..." value={search} onChange={e=>setSearch(e.target.value)} />
          {FORMACAO_ENABLED && (
          <select style={{...inp, fontSize: 12}} value={filterMode} onChange={e=>setFilterMode(e.target.value)}>
            <option value="all">Todos os modos</option>
            <option value="senior">Sénior</option>
            <option value="formacao">Formação</option>
          </select>
          )}
          <select style={{...inp, fontSize: 12}} value={filterDec} onChange={e=>setFilterDec(e.target.value)}>
            <option value="all">Todas as decisões</option>
            {DECISIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select style={{...inp, fontSize: 12}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="date_desc">Data ↓ (mais recente)</option>
            <option value="date_asc">Data ↑ (mais antigo)</option>
            <option value="nota_desc">Nota ↓</option>
            <option value="nota_asc">Nota ↑</option>
            <option value="nome_az">Nome A–Z</option>
          </select>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filteredReports.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "#5E6383", fontSize: 12 }}>Sem relatórios</div>
          )}
          {filteredReports.map(rep => {
            const isActive = !compareMode && rep.id === store.activeId;
            const isSelected = compareMode && compareIds.includes(rep.id);
            const dec = decBadge(rep.decisao);
            return (
              <div key={rep.id} className="card-hover" onClick={() => selectReport(rep.id)} style={{
                padding: 10, marginBottom: 6, borderRadius: 8, cursor: "pointer",
                background: isActive || isSelected ? "#1F2338" : "transparent",
                border: `1px solid ${isActive || isSelected ? S.red : "transparent"}`,
                display: "flex", gap: 10, position: "relative"
              }}>
                {compareMode && (
                  <div style={{
                    position: "absolute", top: 8, left: 8, width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${isSelected ? S.red : "#5E6383"}`,
                    background: isSelected ? S.red : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 12, fontWeight: 700, zIndex: 2
                  }}>{isSelected && "✓"}</div>
                )}
                <div style={{ width: 40, height: 40, borderRadius: 6, background: "#2A2E48", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginLeft: compareMode ? 24 : 0 }}>
                  {rep.foto ? <img src={rep.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 12, color: "#5E6383", fontWeight: 700 }}>{initials(rep.nome)}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 40 }}>{rep.nome || "Sem nome"}</div>
                  <div style={{ fontSize: 10, color: "#5E6383", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rep.pos || "—"} · {rep.clube || "—"}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                    <div style={{ fontSize: 9, color: "#5E6383" }}>{rep.dataRel || "—"}</div>
                    {Number(rep.nota) > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: S.red }}>{rep.nota}</div>}
                  </div>
                </div>
                {dec && !compareMode && <div style={{ position: "absolute", bottom: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: dec.color }} title={dec.label} />}
                {rep.pinned && !compareMode && (
                  <div style={{ position: "absolute", top: 6, left: 8, fontSize: 10, color: "#eab308" }} title="Fixado">★</div>
                )}
                {!compareMode && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); togglePin(rep.id); }} style={{
                      position: "absolute", top: 6, right: 50, opacity: 0, transition: "opacity 0.15s",
                      background: rep.pinned ? "rgba(234,179,8,0.15)" : "rgba(100,100,120,0.2)", border: "none",
                      color: rep.pinned ? "#eab308" : "#5E6383",
                      width: 20, height: 20, borderRadius: 4, cursor: "pointer", fontSize: 11, lineHeight: 1
                    }} className="dup-btn" title={rep.pinned ? "Desafixar" : "Fixar no topo"}>★</button>
                    <button className="dup-btn" onClick={(e) => { e.stopPropagation(); duplicateReport(rep.id); }} style={{
                      position: "absolute", top: 6, right: 28, opacity: 0, transition: "opacity 0.15s",
                      background: "rgba(34,197,94,0.15)", border: "none", color: "#22c55e",
                      width: 20, height: 20, borderRadius: 4, cursor: "pointer", fontSize: 11, lineHeight: 1
                    }} title="Duplicar relatório">⧉</button>
                    <button className="del-btn" onClick={(e) => { e.stopPropagation(); setConfirmDelete(rep.id); }} style={{
                      position: "absolute", top: 6, right: 6, opacity: 0, transition: "opacity 0.15s",
                      background: "rgba(220,38,38,0.15)", border: "none", color: "#C46868",
                      width: 20, height: 20, borderRadius: 4, cursor: "pointer", fontSize: 12, lineHeight: 1
                    }}>×</button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 10, borderTop: `1px solid ${S.border}`, fontSize: 10, color: S.textFaint }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{totalReports} {totalReports === 1 ? "relatório" : "relatórios"}</span>
            <span style={{ color: usage > 95 ? "#C46868" : usage > 80 ? "#eab308" : S.textFaint }}>{usage.toFixed(0)}% usado</span>
          </div>
          <div style={{ height: 3, background: S.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${usage}%`, background: usage > 95 ? "#C46868" : usage > 80 ? "#eab308" : S.red, transition: "width 0.3s" }} />
          </div>
          {usage > 80 && <div style={{ marginTop: 4, color: "#eab308" }}>Considera exportar backup</div>}
          {installPrompt && (
            <button onClick={async () => {
              installPrompt.prompt();
              const { outcome } = await installPrompt.userChoice;
              if (outcome === "accepted") setInstallPrompt(null);
            }} style={{ marginTop: 8, width: "100%", padding: "7px 10px", background: "rgba(221,184,92,0.1)", border: "1px solid rgba(221,184,92,0.3)", color: S.red, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5 }}>
              ↓ Instalar aplicação
            </button>
          )}
        </div>

        {sbUser && (
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${S.border}` }}>
            <div style={{ fontSize: 10, color: S.textFaint, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sbUser.email}</div>
            <button
              onClick={async () => {
                await createClient().auth.signOut();
                window.location.href = "/login";
              }}
              style={{ width: "100%", padding: "7px", background: "transparent", color: S.textDim, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 11, cursor: "pointer" }}
            >Sair →</button>
          </div>
        )}
      </aside>

      {/* BASE DE DADOS DE JOGADORES */}
      {playerDbOpen && (() => {
        const q = dbQuery.trim().toLowerCase();
        const all = playerDb?.players || [];
        const matches = q
          ? all.filter(p =>
              (p.nome || "").toLowerCase().includes(q) ||
              (p.clube || "").toLowerCase().includes(q))
          : all;
        const results = matches.slice(0, 60);
        return (
          <div className="no-print" onClick={() => setPlayerDbOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Procurar jogador</h3>
                  <button onClick={() => setPlayerDbOpen(false)} style={{ background: "none", border: "none", color: "#A4A8C0", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
                <p style={{ fontSize: 11, color: "#5E6383", margin: "0 0 12px" }}>
                  Base pré-carregada: {all.length || "—"} jogadores. Escolhe um para criar um relatório com os dados já preenchidos.
                </p>
                <input
                  autoFocus
                  style={{ ...inp, fontSize: 13 }}
                  placeholder="Nome do jogador ou clube…"
                  value={dbQuery}
                  onChange={e => setDbQuery(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
                {playerDbLoading && <div style={{ padding: 24, textAlign: "center", color: "#5E6383", fontSize: 12 }}>A carregar base de dados…</div>}
                {playerDbError && <div style={{ padding: 24, textAlign: "center", color: "#C46868", fontSize: 12 }}>Não foi possível carregar a base de dados.</div>}
                {!playerDbLoading && !playerDbError && results.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "#5E6383", fontSize: 12 }}>Sem resultados.</div>
                )}
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => createReportFromDbPlayer(p)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 4, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, color: "#fff", cursor: "pointer" }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</span>
                      <span style={{ display: "block", fontSize: 10, color: "#5E6383", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.posLabel} · {p.clube} · {p.idade != null ? `${p.idade}a` : "—"}</span>
                    </span>
                    <span style={{ fontSize: 11, color: S.red, fontWeight: 700, whiteSpace: "nowrap" }}>{p.valorTexto || ""}</span>
                  </button>
                ))}
                {!playerDbLoading && !playerDbError && matches.length > results.length && (
                  <div style={{ padding: "10px 4px", textAlign: "center", color: "#5E6383", fontSize: 11 }}>
                    A mostrar 60 de {matches.length}. Refina a pesquisa.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: 24, maxWidth: 380 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Apagar relatório?</h3>
            <p style={{ fontSize: 13, color: "#A4A8C0", margin: "0 0 20px" }}>Vais apagar o relatório de <strong style={{color:"#fff"}}>{store.reports[confirmDelete]?.nome || "Sem nome"}</strong>. Esta ação não pode ser desfeita.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 16px", background: "transparent", color: "#fff", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => deleteReport(confirmDelete)} style={{ padding: "8px 16px", background: "#C46868", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN AREA */}
      <div className="s3-main-area">
        {/* Mobile topbar with hamburger */}
        <div className="s3-mobile-topbar no-print">
          <button
            className="s3-hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Abrir menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
          <div className="s3-mobile-brand">S³</div>
          <div className="s3-mobile-title">
            {showCompareView ? `Comparação` : (r.nome || "Sem nome")}
          </div>
        </div>

        <header className="no-print" style={{ borderBottom: `1px solid ${S.border}`, padding: "14px 20px", position: "sticky", top: 0, background: S.headerBg, backdropFilter: "blur(8px)", zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, color: "#A4A8C0", display: "flex", alignItems: "center", gap: 10 }}>
              {showCompareView
                ? <>Comparação de <strong style={{color:"#fff"}}>{compareReports.length} jogadores</strong></>
                : <>A editar: <strong style={{color:"#fff"}}>{r.nome || "Sem nome"}</strong></>
              }
              {sbUser?.user_metadata?.course_code && (
                <span style={{ fontSize: 10, color: S.red, fontWeight: 700, background: "rgba(221,184,92,0.1)", border: "1px solid rgba(221,184,92,0.3)", borderRadius: 4, padding: "2px 6px", letterSpacing: 0.5 }}>
                  {sbUser.user_metadata.course_code}
                </span>
              )}
              {sbUser && syncStatus === "syncing" && <span style={{ fontSize: 10, color: "#5E6383", letterSpacing: 0.5 }}>↑ a sincronizar…</span>}
              {sbUser && syncStatus === "error"   && <span style={{ fontSize: 10, color: "#C46868", letterSpacing: 0.5 }}>⚠ erro sync</span>}
              {sbUser && syncStatus === "synced"  && <span style={{ fontSize: 10, color: "#22c55e", letterSpacing: 0.5 }}>✓ guardado {relativeTime(lastSyncedAt)}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* FORMAÇÃO mode hidden until feature complete */}

              {!showCompareView && (
                <>
                  <button onClick={exportPDF} style={{ padding: "8px 14px", background: S.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>PDF</button>
                  <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShareMenuOpen(o => !o)} style={{ padding: "8px 14px", background: S.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>PARTILHAR ▾</button>
                    {shareMenuOpen && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: S.panel, border: `1px solid ${S.border}`, borderRadius: 8, minWidth: 240, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 20 }}>
                        <button onClick={() => { setShareMenuOpen(false); shareCard("stories"); }} style={menuBtn}>
                          <div style={menuBtnTitle}>Stories</div>
                          <div style={menuBtnSub}>1080×1920 · Instagram / TikTok</div>
                        </button>
                        <button onClick={() => { setShareMenuOpen(false); shareCard("vertical"); }} style={{...menuBtn, borderTop: `1px solid ${S.border}`}}>
                          <div style={menuBtnTitle}>Feed Vertical</div>
                          <div style={menuBtnSub}>1080×1350 · Instagram / LinkedIn</div>
                        </button>
                        <button onClick={() => { setShareMenuOpen(false); shareCard("square"); }} style={{...menuBtn, borderTop: `1px solid ${S.border}`}}>
                          <div style={menuBtnTitle}>Feed Quadrado</div>
                          <div style={menuBtnSub}>1080×1080 · Instagram</div>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!showCompareView && (
                <button onClick={() => window.print()} className="no-print" style={{ padding: "8px 14px", background: "#1F2338", color: "#A4A8C0", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>⎙ IMPRIMIR</button>
              )}
              {/* GUARDAR */}
              {!showCompareView && (
                <button
                  onClick={saveReport}
                  title={!idValid ? "Preenche Nome e Clube para guardar" : "Guardar relatório"}
                  style={{
                    padding: "8px 14px",
                    background: idValid ? "#16a34a" : "#1F2338",
                    color: idValid ? "#fff" : S.textDim,
                    border: idValid ? "none" : `1px solid ${S.border}`,
                    borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer"
                  }}
                >GUARDAR</button>
              )}

              {/* v4: DATA menu */}
              <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setDataMenuOpen(o => !o)} style={{ padding: "8px 14px", background: "#1F2338", color: "#fff", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>DADOS ▾</button>
                {dataMenuOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: S.panel, border: `1px solid ${S.border}`, borderRadius: 8, minWidth: 260, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 20 }}>
                    <button onClick={() => { setDataMenuOpen(false); exportReportsToCSV(filteredReports); }} style={menuBtn}>
                      <div style={menuBtnTitle}>Exportar CSV</div>
                      <div style={menuBtnSub}>{filteredReports.length} relatório(s) · compatível com Google Sheets e Excel</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* v5: COMPARISON VIEW */}
        {showCompareView && compareData ? (
          <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ ...h2, margin: 0 }}>Comparação de Jogadores</h2>
              <button onClick={exitCompareMode} style={{ padding: "8px 16px", background: S.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>← SAIR DA COMPARAÇÃO</button>
            </div>

            {/* Player headers */}
            <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${compareReports.length}, 1fr)`, gap: 2, marginBottom: 20, background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={headerCell}>JOGADOR</div>
              {compareReports.map(rep => (
                <div key={rep.id} style={{ ...headerCell, textAlign: "center" }}>
                  <div style={{ width: 60, height: 60, borderRadius: 8, background: "#2A2E48", margin: "0 auto 8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {rep.foto ? <img src={rep.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#5E6383", fontSize: 14, fontWeight: 700 }}>{initials(rep.nome)}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{rep.nome || "Sem nome"}</div>
                  <div style={{ fontSize: 11, color: "#5E6383", marginTop: 2 }}>{rep.pos} · {rep.clube || "—"}</div>
                  <div style={{ fontSize: 10, color: "#5E6383", marginTop: 2 }}>{rep.mode === "senior" ? "Sénior" : "Formação"}</div>
                </div>
              ))}
            </div>

            {/* Identification */}
            <CompareSection title="Identificação" cols={compareReports.length}>
              <CompareRow label="Nacionalidade" values={compareReports.map(r => r.nacionalidade || "—")} />
              <CompareRow label="Data nasc." values={compareReports.map(r => r.dataNasc || "—")} />
              <CompareRow label="Altura (cm)" values={compareReports.map(r => r.altura || "—")} numeric highest />
              <CompareRow label="Peso (kg)" values={compareReports.map(r => r.peso || "—")} />
              <CompareRow label="Pé" values={compareReports.map(r => r.pe || "—")} />
              <CompareRow label="Contrato até" values={compareReports.map(r => r.contratoAte || "—")} />
            </CompareSection>

            {/* Nota global */}
            <CompareSection title="Avaliação Global" cols={compareReports.length}>
              <CompareRow
                label="Nota global"
                values={compareReports.map(r => Number(r.nota) || 0)}
                numeric highest big
              />
              <CompareRow
                label="Decisão"
                values={compareReports.map(r => {
                  const d = DECISIONS.find(x => x.id === r.decisao);
                  return d ? { text: d.label, color: d.color } : "—";
                })}
              />
            </CompareSection>

            {/* Dimensions */}
            {compareData.dims.length > 0 && (
              <CompareSection title="Dimensões" cols={compareReports.length}>
                {compareData.dims.map(row => (
                  <div key={row.key} style={compareRowStyle}>
                    <div style={compareLabelCell}>{row.key}</div>
                    {row.values.map((v, i) => (
                      <div key={i} style={{ ...compareValueCell, color: cellColor(v, row.max, row.min, row.hasDiff), fontWeight: v === row.max && row.hasDiff ? 800 : 600 }}>
                        {v > 0 ? v : "—"}
                      </div>
                    ))}
                  </div>
                ))}
              </CompareSection>
            )}

            {/* Attributes */}
            {compareData.attrs.length > 0 && (
              <CompareSection title="Atributos" cols={compareReports.length}>
                {compareData.attrs.map(row => (
                  <div key={row.key} style={compareRowStyle}>
                    <div style={compareLabelCell}>{row.key}</div>
                    {row.values.map((v, i) => (
                      <div key={i} style={{ ...compareValueCell, color: cellColor(v, row.max, row.min, row.hasDiff), fontWeight: v === row.max && row.hasDiff ? 800 : 600 }}>
                        {v > 0 ? v : "—"}
                      </div>
                    ))}
                  </div>
                ))}
              </CompareSection>
            )}

            {/* Strengths & gaps */}
            <CompareSection title="Pontos Fortes" cols={compareReports.length}>
              <div style={{ ...compareRowStyle, alignItems: "start" }}>
                <div style={compareLabelCell}>Top 3</div>
                {compareReports.map((rep, i) => (
                  <div key={i} style={{ ...compareValueCell, flexDirection: "column", alignItems: "flex-start", textAlign: "left", padding: "12px 14px", color: "#22c55e", fontSize: 12 }}>
                    {(rep.fortes || []).filter(Boolean).map((f, j) => <div key={j} style={{ marginBottom: 4 }}>▸ {f}</div>)}
                    {!(rep.fortes || []).filter(Boolean).length && <span style={{ color: "#5E6383" }}>—</span>}
                  </div>
                ))}
              </div>
            </CompareSection>

            <CompareSection title="Lacunas" cols={compareReports.length}>
              <div style={{ ...compareRowStyle, alignItems: "start" }}>
                <div style={compareLabelCell}>Top 3</div>
                {compareReports.map((rep, i) => (
                  <div key={i} style={{ ...compareValueCell, flexDirection: "column", alignItems: "flex-start", textAlign: "left", padding: "12px 14px", color: "#C46868", fontSize: 12 }}>
                    {(rep.lacunas || []).filter(Boolean).map((f, j) => <div key={j} style={{ marginBottom: 4 }}>▸ {f}</div>)}
                    {!(rep.lacunas || []).filter(Boolean).length && <span style={{ color: "#5E6383" }}>—</span>}
                  </div>
                ))}
              </div>
            </CompareSection>

            <div style={{ fontSize: 11, color: "#5E6383", textAlign: "center", marginTop: 24, paddingBottom: 40 }}>
              Verde = valor mais alto · Vermelho = valor mais baixo · Linhas sem diferença não são destacadas
            </div>
          </main>
        ) : (
        <main id="report" style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>

          {/* ── MODO: toggle SÉNIOR / FORMAÇÃO ── */}
          {FORMACAO_ENABLED && (
          <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {[
              { id: "senior",   label: "SÉNIOR",   desc: "28 parâmetros · 4 categorias" },
              { id: "formacao", label: "FORMAÇÃO",  desc: "Atributos por posição · sliders" }
            ].map(m => (
              <button key={m.id} onClick={() => switchMode(m.id)} style={{
                padding: "10px 18px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                border: `2px solid ${r.mode === m.id ? S.red : S.border}`,
                background: r.mode === m.id ? "rgba(221,184,92,0.12)" : "transparent",
                color: r.mode === m.id ? "#fff" : "#5E6383",
                textAlign: "left"
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: r.mode === m.id ? "#A4A8C0" : "#5E6383", marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
          )}

          <div id="s3-identification" style={sec}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{...h2, marginBottom: 0}}>Identificação</h2>
              {showValidation && !idValid && (
                <div style={{ fontSize: 11, color: "#C46868", fontWeight: 600, background: "rgba(196,104,104,0.1)", border: "1px solid rgba(196,104,104,0.3)", borderRadius: 6, padding: "5px 10px" }}>
                  Nome e Clube são obrigatórios
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 20, alignItems: "start" }}>
              <div>
                <div style={{ width: 150, height: 150, borderRadius: 8, background: "#1F2338", border: `1px dashed ${S.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.foto ? <img src={r.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#5E6383", fontSize: 11 }}>Sem foto</span>}
                </div>
                <label className="no-print" style={{ display: "block", marginTop: 8, cursor: "pointer" }}>
                  <input type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
                  <span style={{ fontSize: 11, color: S.red, textDecoration: "underline" }}>{r.foto ? "Substituir" : "Carregar foto"}</span>
                </label>
                {r.foto && <button className="no-print" onClick={() => u("foto", "")} style={{ marginLeft: 10, fontSize: 11, background: "none", border: "none", color: "#A4A8C0", cursor: "pointer" }}>Remover</button>}
                <div className="no-print" style={{ marginTop: 10 }}>
                  <input
                    style={{ ...inp, fontSize: 11, padding: "6px 8px" }}
                    placeholder="Link Transfermarkt / zerozero…"
                    value={fotoLink}
                    onChange={e => setFotoLink(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); fetchFotoFromLink(); } }}
                    disabled={fotoBusy}
                  />
                  <button
                    onClick={fetchFotoFromLink}
                    disabled={fotoBusy || !fotoLink.trim()}
                    style={{ marginTop: 6, width: "100%", padding: "6px 8px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: fotoBusy ? "default" : "pointer", border: `1px solid ${S.border}`, background: "rgba(221,184,92,0.1)", color: "#fff", opacity: fotoBusy || !fotoLink.trim() ? 0.5 : 1 }}
                  >{fotoBusy ? "A buscar…" : "Buscar foto do link"}</button>
                  {fotoErr && <div style={{ marginTop: 5, fontSize: 10, color: "#C46868" }}>{fotoErr}</div>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <div><label style={{...lbl, color: showValidation && !r.nome?.trim() ? "#C46868" : undefined}}>Nome *</label><input style={{...inp, ...(showValidation && !r.nome?.trim() ? { borderColor: "#C46868", boxShadow: "0 0 0 1px #C46868" } : {})}} value={r.nome} onChange={e=>u("nome",e.target.value)} /></div>
                <div>
                  <label style={lbl}>Data nascimento{age != null && <span style={{ marginLeft: 6, color: S.red, fontWeight: 700 }}>{age} anos</span>}</label>
                  <input style={inp} type="date" value={r.dataNasc} onChange={e=>u("dataNasc",e.target.value)} />
                </div>
                <div><label style={lbl}>Naturalidade</label><input style={inp} value={r.naturalidade} onChange={e=>u("naturalidade",e.target.value)} /></div>
                <div><label style={lbl}>Nacionalidade</label><input style={inp} value={r.nacionalidade} onChange={e=>u("nacionalidade",e.target.value)} /></div>
                <div><label style={{...lbl, color: showValidation && !r.clube?.trim() ? "#C46868" : undefined}}>Clube atual *</label><input style={{...inp, ...(showValidation && !r.clube?.trim() ? { borderColor: "#C46868", boxShadow: "0 0 0 1px #C46868" } : {})}} value={r.clube} onChange={e=>u("clube",e.target.value)} /></div>
                <div><label style={lbl}>Contrato até</label><input style={inp} type="date" value={r.contratoAte} onChange={e=>u("contratoAte",e.target.value)} /></div>
                <div><label style={lbl}>Pé preferencial</label>
                  <select style={inp} value={r.pe} onChange={e=>u("pe",e.target.value)}>
                    <option>Direito</option><option>Esquerdo</option><option>Ambidextro</option>
                  </select>
                </div>
                <div><label style={lbl}>Altura (cm)</label><input style={inp} value={r.altura} onChange={e=>u("altura",e.target.value)} /></div>
                <div><label style={lbl}>Peso (kg)</label><input style={inp} value={r.peso} onChange={e=>u("peso",e.target.value)} /></div>
                <div><label style={lbl}>Agente</label><input style={inp} value={r.agente} onChange={e=>u("agente",e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Percurso (clubes anteriores)</label><input style={inp} value={r.percurso} onChange={e=>u("percurso",e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Dados biográficos</label><textarea style={{ ...inp, minHeight: 64, resize: "vertical" }} value={r.bio} onChange={e=>u("bio",e.target.value)} placeholder="Idade, valor de mercado, competição, nacionalidades…" /></div>
              </div>
            </div>
          </div>

          {/* ============ ESTATÍSTICAS DA ÉPOCA (v11) ============ */}
          <div style={sec}>
            <h2 style={h2}>Estatísticas da Época</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1.5, marginBottom: 6 }}>Jogos</div>
                <input type="number" min="0" value={r.jogos} onChange={e => u("jogos", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", textAlign: "center", color: "#fff", fontSize: 36, fontWeight: 900, padding: 0, fontFamily: "inherit", outline: "none" }}
                  placeholder="—" />
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>época atual</div>
              </div>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1.5, marginBottom: 6 }}>Golos</div>
                <input type="number" min="0" value={r.golos} onChange={e => u("golos", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", textAlign: "center", color: S.red, fontSize: 36, fontWeight: 900, padding: 0, fontFamily: "inherit", outline: "none" }}
                  placeholder="—" />
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>época atual</div>
              </div>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1.5, marginBottom: 6 }}>Assistências</div>
                <input type="number" min="0" value={r.assists} onChange={e => u("assists", e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", textAlign: "center", color: "#22c55e", fontSize: 36, fontWeight: 900, padding: 0, fontFamily: "inherit", outline: "none" }}
                  placeholder="—" />
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>época atual</div>
              </div>
            </div>
          </div>

          {/* ============ POSIÇÃO NO CAMPO ============ */}
          <div style={sec}>
            <h2 style={h2}>Posição no Campo</h2>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 20, alignItems: "start" }}>
              {r.mode === "senior" ? (
                <Pitch
                  positions={SENIOR_POSITIONS}
                  selected={r.pos}
                  secondary={r.posSec}
                  onSelect={(code) => { if (code !== r.pos) updateActive({ pos: code, cats: {} }); }}
                />
              ) : (
                <Pitch
                  positions={FORMACAO_POSITIONS}
                  selected={r.pos}
                  secondary={r.posSec}
                  onSelect={(code) => {
                    const prevBase = getFormacaoPosMeta(r.pos)?.attrBase;
                    const nextBase = getFormacaoPosMeta(code)?.attrBase;
                    if (prevBase !== nextBase) updateActive({ pos: code, atr: {} });
                    else u("pos", code);
                  }}
                />
              )}
              <div>
                <div style={{ marginBottom: 16, padding: 14, background: "#161929", border: `1px solid ${S.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 6 }}>Posição Principal</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: S.red }}>{r.pos}</div>
                  <div style={{ fontSize: 12, color: "#A4A8C0", marginTop: 2 }}>{posMeta?.label || "—"}</div>
                </div>
                <div style={{ padding: 14, background: "#161929", border: `1px solid ${S.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 6 }}>Posição Secundária</div>
                  {r.posSec ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#eab308" }}>{r.posSec}</div>
                      <div style={{ fontSize: 12, color: "#A4A8C0", marginTop: 2 }}>
                        {r.mode === "senior" ? (getPosMeta(r.posSec)?.label || r.posSec) : (getFormacaoPosMeta(r.posSec)?.label || r.posSec)}
                      </div>
                      <button onClick={() => u("posSec", "")} style={{ marginTop: 8, fontSize: 10, background: "transparent", border: `1px solid ${S.border}`, color: "#A4A8C0", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>Remover</button>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#5E6383" }}>Nenhuma. Usa o select abaixo para definir.</div>
                  )}
                  <select style={{ ...inp, marginTop: 10, fontSize: 11 }} value={r.posSec} onChange={e => u("posSec", e.target.value)}>
                    <option value="">— Selecionar secundária —</option>
                    {(r.mode === "senior" ? SENIOR_POSITIONS : FORMACAO_POSITIONS).filter(p => p.code !== r.pos).map(p => (
                      <option key={p.code} value={p.code}>{p.code} — {p.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: "#5E6383", lineHeight: 1.5 }}>
                  Clica num círculo do campo para definir a posição principal. Para a secundária, usa o select.
                </div>
              </div>
            </div>
          </div>

          <div style={sec}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 6 }}>Idade</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{age != null ? age : "—"}</div>
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>{age != null ? "anos" : "sem data"}</div>
              </div>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 6 }}>Contrato</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: contract?.color || "#5E6383", lineHeight: 1 }}>{contract ? contract.label : "—"}</div>
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>{contract ? "até fim" : "sem data"}</div>
              </div>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 6 }}>Nota Global</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: S.red, lineHeight: 1 }}>{autoNota || "—"}</div>
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>{r.mode === "senior" ? "auto · escala 1-5" : "auto · escala 0-10"}</div>
              </div>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 8 }}>Potencial</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                  {["P1","P2","P3"].map(p => (
                    <button key={p} type="button" onClick={() => u("potencial", r.potencial === p ? "" : p)}
                      style={{ background: r.potencial === p ? S.red : "transparent", border: `1px solid ${r.potencial === p ? S.red : "#383D5C"}`, color: r.potencial === p ? "#fff" : "#5E6383", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 13, fontWeight: 800, lineHeight: 1 }}>{p}</button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>topo estimado</div>
              </div>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1, marginBottom: 8 }}>Rendimento</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                  {["R1","R2","R3"].map(p => (
                    <button key={p} type="button" onClick={() => u("rendimento", r.rendimento === p ? "" : p)}
                      style={{ background: r.rendimento === p ? "#eab308" : "transparent", border: `1px solid ${r.rendimento === p ? "#eab308" : "#383D5C"}`, color: r.rendimento === p ? "#fff" : "#5E6383", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 13, fontWeight: 800, lineHeight: 1 }}>{p}</button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>performance atual</div>
              </div>
            </div>
          </div>

          <div style={sec}>
            <h2 style={h2}>Última Observação <span style={{ fontSize: 10, color: "#5E6383", textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>(opcional)</span></h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div><label style={lbl}>Data</label><input style={inp} type="date" value={r.data} onChange={e=>u("data",e.target.value)} /></div>
              <div><label style={lbl}>Competição</label><input style={inp} value={r.comp} onChange={e=>u("comp",e.target.value)} /></div>
              <div><label style={lbl}>Adversário</label><input style={inp} value={r.adv} onChange={e=>u("adv",e.target.value)} /></div>
              <div><label style={lbl}>Resultado</label><input style={inp} value={r.resultado} onChange={e=>u("resultado",e.target.value)} /></div>
              <div><label style={lbl}>Min. observados</label><input style={inp} value={r.min} onChange={e=>u("min",e.target.value)} /></div>
              <div><label style={lbl}>Sistema</label><input style={inp} value={r.sistema} onChange={e=>u("sistema",e.target.value)} placeholder="4-3-3..." /></div>
            </div>
          </div>

          {/* ============ AVALIAÇÃO ============ */}
          {r.mode === "senior" && seniorCats ? (
            /* ── SÉNIOR: 4 categorias × 7 itens com TapRating ── */
            <div style={sec}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{...h2, marginBottom: 0}}>Avaliação — {posMeta?.label || r.pos}</h2>
                <div style={{ fontSize: 11, color: "#5E6383" }}>
                  escala 1–5 &nbsp;|&nbsp; média: <span style={{ color: S.red, fontWeight: 700 }}>{autoNota || "—"}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {Object.entries(seniorCats).map(([ck, cat]) => {
                  const catVals = cat.items.map((_, i) => Number((r.cats || {})[`${ck}_${i}`] || 0)).filter(v => v > 0);
                  const catAvg = catVals.length ? (catVals.reduce((a,b)=>a+b,0)/catVals.length).toFixed(1) : "—";
                  return (
                    <div key={ck} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${S.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: S.red, textTransform: "uppercase" }}>{cat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: catAvg !== "—" ? tapColor(Number(catAvg)) : "#5E6383" }}>{catAvg}</div>
                      </div>
                      {cat.items.map((item, i) => (
                        <TapRating
                          key={i}
                          label={item}
                          value={(r.cats || {})[`${ck}_${i}`] || 0}
                          onChange={v => u("cats", { ...(r.cats || {}), [`${ck}_${i}`]: v })}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── FORMAÇÃO: sliders 0-10 + dimensões ── */
            <>
              <div style={sec}>
                <div style={{ marginBottom: 14 }}>
                  <h2 style={{...h2, marginBottom: 0}}>Atributos ({posMeta?.label || r.pos})</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    {attrs.map(a => (
                      <div key={a} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span>{a}</span>
                          <span>
                            {posAvg[a] > 0 && <span style={{ color: "#5E6383", fontSize: 10, marginRight: 6 }}>avg {posAvg[a]}</span>}
                            <span style={{ color: sliderColor(r.atr[a] || 0), fontWeight: 700 }}>{r.atr[a] || 0}</span>
                          </span>
                        </div>
                        <input type="range" min="0" max="10" value={r.atr[a] || 0} onChange={e=>u("atr",{...r.atr, [a]: Number(e.target.value)})} style={{ width: "100%", accentColor: sliderColor(r.atr[a] || 0) }} />
                      </div>
                    ))}
                    <div style={{ fontSize: 12, color: "#A4A8C0", marginTop: 8 }}>Média: <span style={{ color: sliderColor(Number(media)), fontWeight: 700, fontSize: 16 }}>{media}</span></div>
                  </div>
                  <div style={{ background: "#1F2338", borderRadius: 8, padding: 10, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#2A2E48" />
                        <PolarAngleAxis dataKey="attr" tick={{ fill: "#A4A8C0", fontSize: 9 }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "#5E6383", fontSize: 8 }} />
                        <Radar name="Jogador" dataKey="v" stroke={S.red} fill={S.red} fillOpacity={0.45} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div style={sec}>
                <h2 style={h2}>Dimensões</h2>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${dims.length}, 1fr)`, gap: 12 }}>
                  {dims.map(d => {
                    const val = r.dim[d] || 0;
                    const valColor = sliderColor(val);
                    return (
                      <div key={d} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "18px 14px 14px 14px", textAlign: "center", position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: val > 0 ? valColor : S.border, borderTopLeftRadius: 10, borderTopRightRadius: 10, opacity: val > 0 ? 0.8 : 0.3 }} />
                        <div style={{ fontSize: 10, textTransform: "uppercase", color: "#5E6383", letterSpacing: 1.5, fontWeight: 600, marginBottom: 8 }}>{d}</div>
                        <div style={{ fontSize: 42, fontWeight: 900, color: val > 0 ? valColor : "#383D5C", lineHeight: 1, marginBottom: 4 }}>{val}</div>
                        <div style={{ fontSize: 9, color: "#5E6383", marginBottom: 12 }}>/ 10</div>
                        <input type="range" min="0" max="10" value={val} onChange={e=>u("dim",{...r.dim, [d]: Number(e.target.value)})} style={{ width: "100%", accentColor: val > 0 ? valColor : S.red, cursor: "pointer" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div style={sec}>
            <h2 style={h2}>Pontos Fortes & Lacunas</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={{...lbl, color: "#16a34a"}}>3 Pontos Fortes</label>
                {[0,1,2].map(i => (
                  <input key={i} style={{...inp, marginBottom: 8}} placeholder={`${i+1}.`} value={r.fortes[i]} onChange={e=>{const n=[...r.fortes]; n[i]=e.target.value; u("fortes",n);}} />
                ))}
              </div>
              <div>
                <label style={{...lbl, color: "#C46868"}}>3 Lacunas</label>
                {[0,1,2].map(i => (
                  <input key={i} style={{...inp, marginBottom: 8}} placeholder={`${i+1}.`} value={r.lacunas[i]} onChange={e=>{const n=[...r.lacunas]; n[i]=e.target.value; u("lacunas",n);}} />
                ))}
              </div>
            </div>
          </div>

          <div style={sec}>
            <h2 style={h2}>Parecer</h2>
            <div><label style={lbl}>Parecer final</label><textarea
              ref={el => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              style={{...inp, resize: "none", overflow: "hidden", minHeight: 80}}
              value={r.parecer} onChange={e=>u("parecer",e.target.value)}
            /></div>
          </div>

          <div style={sec}>
            <h2 style={h2}>Decisão</h2>

            {r.mode === "senior" ? (
              /* ── SÉNIOR: classificação 7 níveis + decisão 4 opções + 3 horizontes ── */
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Classificação</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {CLASSIFICACAO_OPTIONS.map(c => (
                      <button key={c} onClick={() => u("classificacao", c)} style={{
                        padding: "10px 6px", borderRadius: 8, border: `1px solid ${r.classificacao === c ? S.red : S.border}`,
                        background: r.classificacao === c ? "rgba(221,184,92,0.15)" : "#1F2338", color: r.classificacao === c ? "#fff" : "#5E6383",
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.5, cursor: "pointer", transition: "all 0.15s"
                      }}>{c}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Decisão</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {DECISAO_SENIOR.map(d => {
                      const col = d === "CONTRATAR JÁ" ? "#16a34a" : d === "CONTRATAR" ? "#22c55e" : d === "MONITORIZAR" ? "#eab308" : "#C46868";
                      return (
                        <button key={d} onClick={() => u("decisao", d)} style={{
                          padding: "14px 8px", borderRadius: 8, border: `2px solid ${r.decisao === d ? col : S.border}`,
                          background: r.decisao === d ? col : "#1F2338", color: "#fff",
                          fontSize: 11, fontWeight: 700, letterSpacing: 0.5, cursor: "pointer", transition: "all 0.15s"
                        }}>{d}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[["avImediata","AV. IMEDIATA"],["avMedioPrazo","AV. MÉDIO PRAZO"],["avLongoPrazo","AV. LONGO PRAZO"]].map(([k,l]) => (
                    <div key={k} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{l}</div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                        {[1,2,3,4,5].map(v => (
                          <button key={v} type="button" onClick={() => u(k, v)} style={{
                            width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer",
                            background: r[k] === v ? S.red : "rgba(255,255,255,0.05)",
                            color: "#fff", fontSize: 13, fontWeight: 800, WebkitTapHighlightColor: "transparent"
                          }}>{v}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* ── FORMAÇÃO: 3 botões simples ── */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {DECISIONS.map(d => (
                  <button key={d.id} onClick={() => u("decisao", d.id)} style={{
                    padding: "24px 12px", borderRadius: 10, border: `2px solid ${r.decisao === d.id ? d.color : S.border}`,
                    background: r.decisao === d.id ? d.color : "#1F2338", color: "#fff",
                    fontSize: 15, fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "all 0.2s"
                  }}>{d.label}</button>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
              <div><label style={lbl}>Scout</label><input style={inp} value={r.scout} onChange={e=>u("scout",e.target.value)} /></div>
              <div><label style={lbl}>Data do relatório</label><input type="date" style={inp} value={r.dataRel} onChange={e=>u("dataRel",e.target.value)} /></div>
            </div>
          </div>
        </main>
        )}
      </div>

      {/* ============ SHARE CARDS (v12: FIFA+FM hybrid) ============ */}
      <div style={{ position: "absolute", left: -9999, top: 0 }}>

        {/* ===== VERTICAL 1080x1350 ===== */}
        <div ref={shareVerticalRef} style={{ width: 1080, height: 1350, background: S.bg, color: "#fff", padding: 50, fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
          {/* TOP BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, paddingBottom: 14, borderBottom: `2px solid ${S.red}` }}>
            <div>
              <div style={{ color: S.red, fontSize: 36, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>SPORTRAIL</div>
              <div style={{ fontSize: 12, color: "#5E6383", letterSpacing: 2, marginTop: 4 }}>S³ SCOUTING REPORT</div>
            </div>
            <div style={{ fontSize: 13, color: "#5E6383", textAlign: "right" }}>
              {r.dataRel && <div>{r.dataRel}</div>}
              {r.scout && <div style={{ marginTop: 2 }}>{r.scout}</div>}
            </div>
          </div>

          {/* PLAYER HEADER: photo + info + nota */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 180px", gap: 24, alignItems: "center", marginBottom: 18 }}>
            {/* Photo */}
            <div style={{ position: "relative", width: 200, height: 240 }}>
              <div style={{ width: 200, height: 240, borderRadius: 12, background: "#1F2338", border: `3px solid ${S.red}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", ...(r.foto ? { backgroundImage: `url(${r.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
                {!r.foto && <span style={{ color: S.red, fontSize: 80, fontWeight: 900 }}>{initials(r.nome)}</span>}
              </div>
              {/* Position badge bottom-right of photo */}
              {r.mode === "senior" && r.pos && (
                <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", background: S.red, color: "#fff", padding: "6px 18px", borderRadius: 8, fontSize: 18, fontWeight: 900, letterSpacing: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", border: "2px solid #fff" }}>
                  {r.pos}
                </div>
              )}
            </div>

            {/* Name + info */}
            <div style={{ minWidth: 0, overflow: "hidden", paddingTop: 8 }}>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, color: "#fff", wordBreak: "break-word", textTransform: "uppercase", letterSpacing: 0.5 }}>{r.nome || "—"}</div>
              <div style={{ fontSize: 17, color: S.red, marginTop: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {r.clube || "—"}
              </div>
              <div style={{ fontSize: 14, color: "#A4A8C0", marginTop: 4 }}>
                {[r.mode === "senior" ? (getPosMeta(r.pos)?.label || r.pos) : r.pos, `Pé ${r.pe}`].filter(Boolean).join(" · ")}
              </div>
              <div style={{ fontSize: 13, color: "#5E6383", marginTop: 4 }}>
                {[r.nacionalidade, age != null && `${age} anos`, r.altura && `${r.altura} cm`, r.peso && `${r.peso} kg`].filter(Boolean).join(" · ")}
              </div>
            </div>

            {/* NOTA */}
            <div style={{ textAlign: "center", borderLeft: `1px solid ${S.border}`, paddingLeft: 18 }}>
              <div style={{ fontSize: 11, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>Nota</div>
              <div style={{ fontSize: 110, fontWeight: 900, color: S.red, lineHeight: 0.95 }}>{autoNota || r.nota || "—"}</div>
              <div style={{ fontSize: 12, color: "#5E6383", marginTop: -4 }}>/ {r.mode === "senior" ? "5" : "10"}</div>
              {r.mode === "senior" && r.classificacao && (
                <div style={{ marginTop: 8, padding: "4px 10px", background: "rgba(221,184,92,0.15)", border: `1px solid ${S.red}`, borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>{r.classificacao}</div>
              )}
              {r.mode !== "senior" && (r.potencial || r.rendimento) && (
                <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center" }}>
                  {r.potencial && <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", background: S.red, padding: "3px 8px", borderRadius: 5 }}>{r.potencial}</span>}
                  {r.rendimento && <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", background: "#eab308", padding: "3px 8px", borderRadius: 5 }}>{r.rendimento}</span>}
                </div>
              )}
            </div>
          </div>

          {/* SEASON STATS — 3 big tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
            {[
              { label: "JOGOS", value: r.jogos, color: "#fff" },
              { label: "GOLOS", value: r.golos, color: S.red },
              { label: "ASSISTÊNCIAS", value: r.assists, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 0", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 44, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value || "—"}</div>
              </div>
            ))}
          </div>

          {/* CATEGORIAS (sénior) / RADAR (formação) */}
          {r.mode === "senior" && catAvgs ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {seniorCats && Object.entries(seniorCats).map(([ck, cat]) => {
                const avg = catAvgs[ck] || 0;
                const barColor = tapColor(avg) || "#383D5C";
                return (
                  <div key={ck} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 12px 6px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: barColor, textTransform: "uppercase", letterSpacing: 1.5 }}>{cat.label}</span>
                      <span style={{ fontSize: 20, fontWeight: 900, color: barColor, lineHeight: 1 }}>{avg || "—"}</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 7, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${avg > 0 ? (avg / 5) * 100 : 0}%`, background: barColor, borderRadius: 2 }} />
                    </div>
                    {cat.items.map((item, i) => {
                      const v = Number((r.cats || {})[`${ck}_${i}`] || 0);
                      const vColor = v > 0 ? tapColor(v) : "#2A2E48";
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: v > 0 ? vColor : "#2A2E48", flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: "#A4A8C0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: v > 0 ? vColor : "#2A2E48", flexShrink: 0 }}>{v || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 12, padding: "16px 16px 8px 16px", marginBottom: 14, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, alignSelf: "flex-start" }}>
                ATRIBUTOS {posMeta && `· ${posMeta.label}`}
              </div>
              <div style={{ width: 320, height: 320 }}>
                <ShareRadar labels={attrs} values={attrs.map(a => r.atr[a] || 0)} size={320} color={S.red} labelColor="#A4A8C0" valueColor={S.red} gridColor="#383D5C" />
              </div>
            </div>
          )}

          {/* ASSESSMENTS (sénior) / DIMENSÕES (formação) */}
          {r.mode === "senior" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[["avImediata","IMEDIATA"],["avMedioPrazo","MÉDIO PRAZO"],["avLongoPrazo","LONGO PRAZO"]].map(([k, l]) => {
                const val = r[k] || 0;
                const vColor = val > 0 ? tapColor(val) : "#383D5C";
                return (
                  <div key={k} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: val > 0 ? vColor : "#383D5C", lineHeight: 1 }}>{val || "—"}</div>
                    <div style={{ fontSize: 10, color: "#5E6383", marginTop: 4 }}>/ 5</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${dims.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
              {dims.map(d => {
                const val = Number(r.dim[d] || 0);
                const valColor = sliderColor(val);
                return (
                  <div key={d} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: val > 0 ? valColor : S.border, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
                    <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{d}</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: val > 0 ? valColor : "#383D5C", lineHeight: 1, marginTop: 4 }}>{val}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* FORTES + LACUNAS — compact 2 cols */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14, flex: 1 }}>
            <div>
              <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 800, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>✓ Pontos Fortes</div>
              {r.fortes.filter(Boolean).slice(0, 3).map((f, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4, color: "#A4A8C0", lineHeight: 1.3 }}>
                  <span style={{ color: "#22c55e", marginRight: 4 }}>▸</span>{f}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#C46868", fontWeight: 800, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>✗ Lacunas</div>
              {r.lacunas.filter(Boolean).slice(0, 3).map((f, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4, color: "#A4A8C0", lineHeight: 1.3 }}>
                  <span style={{ color: "#C46868", marginRight: 4 }}>▸</span>{f}
                </div>
              ))}
            </div>
          </div>

          {/* DECISION BAR */}
          {r.mode === "senior" ? (
            r.decisao && seniorDecColor && (
              <div style={{ padding: 18, background: seniorDecColor, borderRadius: 12, textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", letterSpacing: 2, marginBottom: 3 }}>{r.classificacao}</div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 3, color: "#fff" }}>{r.decisao}</div>
              </div>
            )
          ) : (
            decObj && (
              <div style={{ padding: 18, background: decObj.color, borderRadius: 12, textAlign: "center", fontSize: 30, fontWeight: 900, letterSpacing: 3, color: "#fff", marginBottom: 10 }}>
                {decObj.label}
              </div>
            )
          )}

          {/* FOOTER */}
          <div style={{ fontSize: 12, color: "#5E6383", textAlign: "center" }}>
            scouting.sportrail.pt
          </div>
        </div>

        {/* ===== SQUARE 1080x1080 ===== */}
        <div ref={shareSquareRef} style={{ width: 1080, height: 1080, background: S.bg, color: "#fff", padding: 44, fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
          {/* TOP BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 12, borderBottom: `2px solid ${S.red}` }}>
            <div>
              <div style={{ color: S.red, fontSize: 30, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>SPORTRAIL</div>
              <div style={{ fontSize: 11, color: "#5E6383", letterSpacing: 2, marginTop: 3 }}>S³ SCOUTING REPORT</div>
            </div>
            <div style={{ fontSize: 12, color: "#5E6383", textAlign: "right" }}>
              {r.dataRel && <div>{r.dataRel}</div>}
              {r.scout && <div style={{ marginTop: 2 }}>{r.scout}</div>}
            </div>
          </div>

          {/* PLAYER HEADER: photo + info + nota */}
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 160px", gap: 22, alignItems: "center", marginBottom: 16 }}>
            <div style={{ position: "relative", width: 180, height: 220 }}>
              <div style={{ width: 180, height: 220, borderRadius: 12, background: "#1F2338", border: `3px solid ${S.red}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", ...(r.foto ? { backgroundImage: `url(${r.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
                {!r.foto && <span style={{ color: S.red, fontSize: 72, fontWeight: 900 }}>{initials(r.nome)}</span>}
              </div>
              {r.mode === "senior" && r.pos && (
                <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", background: S.red, color: "#fff", padding: "5px 16px", borderRadius: 7, fontSize: 16, fontWeight: 900, letterSpacing: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", border: "2px solid #fff" }}>
                  {r.pos}
                </div>
              )}
            </div>

            <div style={{ minWidth: 0, overflow: "hidden", paddingTop: 6 }}>
              <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.05, color: "#fff", wordBreak: "break-word", textTransform: "uppercase", letterSpacing: 0.5 }}>{r.nome || "—"}</div>
              <div style={{ fontSize: 14, color: S.red, marginTop: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {r.clube || "—"}
              </div>
              <div style={{ fontSize: 12, color: "#A4A8C0", marginTop: 4 }}>
                {[r.mode === "senior" ? (getPosMeta(r.pos)?.label || r.pos) : r.pos, `Pé ${r.pe}`].filter(Boolean).join(" · ")}
              </div>
              <div style={{ fontSize: 11, color: "#5E6383", marginTop: 3 }}>
                {[r.nacionalidade, age != null && `${age} anos`, r.altura && `${r.altura} cm`].filter(Boolean).join(" · ")}
              </div>
              {/* Inline season stats compact */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {[
                  { label: "J", value: r.jogos, color: "#fff" },
                  { label: "G", value: r.golos, color: S.red },
                  { label: "A", value: r.assists, color: "#22c55e" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: "#161929", border: `1px solid ${S.border}`, borderRadius: 7, padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#5E6383", letterSpacing: 1, fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "center", borderLeft: `1px solid ${S.border}`, paddingLeft: 14 }}>
              <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>Nota</div>
              <div style={{ fontSize: 92, fontWeight: 900, color: S.red, lineHeight: 0.95 }}>{autoNota || r.nota || "—"}</div>
              <div style={{ fontSize: 11, color: "#5E6383", marginTop: -2 }}>/ {r.mode === "senior" ? "5" : "10"}</div>
              {r.mode === "senior" && r.classificacao && (
                <div style={{ marginTop: 8, padding: "3px 8px", background: "rgba(221,184,92,0.15)", border: `1px solid ${S.red}`, borderRadius: 5, fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>{r.classificacao}</div>
              )}
              {r.mode !== "senior" && (r.potencial || r.rendimento) && (
                <div style={{ marginTop: 8, display: "flex", gap: 5, justifyContent: "center" }}>
                  {r.potencial && <span style={{ fontSize: 12, fontWeight: 900, color: "#fff", background: S.red, padding: "2px 7px", borderRadius: 4 }}>{r.potencial}</span>}
                  {r.rendimento && <span style={{ fontSize: 12, fontWeight: 900, color: "#fff", background: "#eab308", padding: "2px 7px", borderRadius: 4 }}>{r.rendimento}</span>}
                </div>
              )}
            </div>
          </div>

          {/* CATEGORIAS (sénior) / RADAR+DIMENSÕES (formação) */}
          {r.mode === "senior" && catAvgs ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {seniorCats && Object.entries(seniorCats).map(([ck, cat]) => {
                  const avg = catAvgs[ck] || 0;
                  const barColor = tapColor(avg) || "#383D5C";
                  return (
                    <div key={ck} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 9, padding: "9px 10px 5px 10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: barColor, textTransform: "uppercase", letterSpacing: 1.5 }}>{cat.label}</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: barColor, lineHeight: 1 }}>{avg || "—"}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${avg > 0 ? (avg / 5) * 100 : 0}%`, background: barColor, borderRadius: 2 }} />
                      </div>
                      {cat.items.map((item, i) => {
                        const v = Number((r.cats || {})[`${ck}_${i}`] || 0);
                        const vColor = v > 0 ? tapColor(v) : "#2A2E48";
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2, gap: 3 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
                              <div style={{ width: 4, height: 4, borderRadius: "50%", background: v > 0 ? vColor : "#2A2E48", flexShrink: 0 }} />
                              <span style={{ fontSize: 9, color: "#A4A8C0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: v > 0 ? vColor : "#2A2E48", flexShrink: 0 }}>{v || "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[["avImediata","IMEDIATA"],["avMedioPrazo","MÉDIO PRAZO"],["avLongoPrazo","LONGO PRAZO"]].map(([k, l]) => {
                  const val = r[k] || 0;
                  const vColor = val > 0 ? tapColor(val) : "#383D5C";
                  return (
                    <div key={k} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#5E6383", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: val > 0 ? vColor : "#383D5C", lineHeight: 1 }}>{val || "—"}</div>
                      <div style={{ fontSize: 9, color: "#5E6383" }}>/ 5</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, flex: 1, marginBottom: 12 }}>
              <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 12, padding: "14px 14px 6px 14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2, alignSelf: "flex-start" }}>
                  ATRIBUTOS {posMeta && `· ${posMeta.label}`}
                </div>
                <div style={{ width: "100%", maxWidth: 320, flex: 1 }}>
                  <ShareRadar labels={attrs} values={attrs.map(a => r.atr[a] || 0)} size={320} color={S.red} labelColor="#A4A8C0" valueColor={S.red} gridColor="#383D5C" />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>DIMENSÕES</div>
                {dims.map(d => {
                  const val = Number(r.dim[d] || 0);
                  const valColor = sliderColor(val);
                  return (
                    <div key={d} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", flex: 1 }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: val > 0 ? valColor : S.border, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} />
                      <div style={{ fontSize: 13, color: "#A4A8C0", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginLeft: 6 }}>{d}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: val > 0 ? valColor : "#383D5C", lineHeight: 1 }}>{val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FORTES + LACUNAS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 800, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.5 }}>✓ Pontos Fortes</div>
              {r.fortes.filter(Boolean).slice(0, 3).map((f, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 3, color: "#A4A8C0", lineHeight: 1.3 }}>
                  <span style={{ color: "#22c55e", marginRight: 4 }}>▸</span>{f}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#C46868", fontWeight: 800, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.5 }}>✗ Lacunas</div>
              {r.lacunas.filter(Boolean).slice(0, 3).map((f, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 3, color: "#A4A8C0", lineHeight: 1.3 }}>
                  <span style={{ color: "#C46868", marginRight: 4 }}>▸</span>{f}
                </div>
              ))}
            </div>
          </div>

          {/* DECISION BAR */}
          {r.mode === "senior" ? (
            r.decisao && seniorDecColor && (
              <div style={{ padding: 14, background: seniorDecColor, borderRadius: 10, textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", letterSpacing: 2, marginBottom: 2 }}>{r.classificacao}</div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2.5, color: "#fff" }}>{r.decisao}</div>
              </div>
            )
          ) : (
            decObj && (
              <div style={{ padding: 14, background: decObj.color, borderRadius: 10, textAlign: "center", fontSize: 24, fontWeight: 900, letterSpacing: 2.5, color: "#fff", marginBottom: 8 }}>
                {decObj.label}
              </div>
            )
          )}

          {/* FOOTER */}
          <div style={{ fontSize: 11, color: "#5E6383", textAlign: "center" }}>
            scouting.sportrail.pt
          </div>
        </div>

        {/* ===== STORIES 1080x1920 ===== */}
        <div ref={shareStoriesRef} style={{ width: 1080, height: 1920, background: S.bg, color: "#fff", padding: 60, fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
          {/* BRAND BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, marginBottom: 36, borderBottom: `3px solid ${S.red}` }}>
            <div>
              <div style={{ color: S.red, fontSize: 64, fontWeight: 900, letterSpacing: 3, lineHeight: 1 }}>S³</div>
              <div style={{ fontSize: 13, color: "#5E6383", letterSpacing: 3, marginTop: 4, fontWeight: 700 }}>SPORTRAIL SCOUTING</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 14, color: "#5E6383" }}>
              {r.dataRel && <div>{r.dataRel}</div>}
              {r.scout && <div style={{ marginTop: 4 }}>{r.scout}</div>}
            </div>
          </div>

          {/* PLAYER HERO */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
            <div style={{ position: "relative", width: 280, height: 340, marginBottom: 28 }}>
              <div style={{ width: 280, height: 340, borderRadius: 20, background: "#1F2338", border: `4px solid ${S.red}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", ...(r.foto ? { backgroundImage: `url(${r.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
                {!r.foto && <span style={{ color: S.red, fontSize: 110, fontWeight: 900, lineHeight: 1 }}>{initials(r.nome)}</span>}
              </div>
              {r.mode === "senior" && r.pos && (
                <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", background: S.red, color: "#fff", padding: "6px 22px", borderRadius: 8, fontSize: 22, fontWeight: 900, letterSpacing: 2, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", border: "3px solid #fff", whiteSpace: "nowrap" }}>
                  {r.pos}
                </div>
              )}
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.05, color: "#fff", textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 10 }}>{r.nome || "—"}</div>
            <div style={{ fontSize: 22, color: S.red, fontWeight: 700, letterSpacing: 1, textAlign: "center", marginBottom: 6 }}>{r.clube || "—"}</div>
            <div style={{ fontSize: 15, color: "#A4A8C0", textAlign: "center" }}>
              {[r.mode === "senior" ? (getPosMeta(r.pos)?.label || r.pos) : r.pos, `Pé ${r.pe}`, age != null && `${age} anos`].filter(Boolean).join(" · ")}
            </div>
          </div>

          {/* NOTA + P/R */}
          <div style={{ textAlign: "center", marginBottom: 28, padding: "22px 0", borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
            <div style={{ fontSize: 11, color: "#5E6383", textTransform: "uppercase", letterSpacing: 3, marginBottom: 6 }}>Nota Global</div>
            <div style={{ fontSize: 140, fontWeight: 900, color: S.red, lineHeight: 0.9 }}>{autoNota || r.nota || "—"}</div>
            <div style={{ fontSize: 14, color: "#5E6383", marginBottom: 14 }}>/ {r.mode === "senior" ? "5" : "10"}</div>
            {r.mode === "senior" && r.classificacao && (
              <div style={{ display: "inline-block", padding: "6px 20px", background: "rgba(221,184,92,0.15)", border: `1px solid ${S.red}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>{r.classificacao}</div>
            )}
            {r.mode !== "senior" && (r.potencial || r.rendimento) && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                {r.potencial && <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", background: S.red, padding: "6px 18px", borderRadius: 8 }}>{r.potencial}</span>}
                {r.rendimento && <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", background: "#eab308", padding: "6px 18px", borderRadius: 8 }}>{r.rendimento}</span>}
              </div>
            )}
          </div>

          {/* SEASON STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
            {[
              { label: "JOGOS", value: r.jogos, color: "#fff" },
              { label: "GOLOS", value: r.golos, color: S.red },
              { label: "ASSIST.", value: r.assists, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 14, padding: "18px 0", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value || "—"}</div>
              </div>
            ))}
          </div>

          {/* CATEGORIAS (sénior) / RADAR (formação) */}
          {r.mode === "senior" && catAvgs ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24, flex: 1, minHeight: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
                {seniorCats && Object.entries(seniorCats).map(([ck, cat]) => {
                  const avg = catAvgs[ck] || 0;
                  const barColor = tapColor(avg) || "#383D5C";
                  return (
                    <div key={ck} style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 14, padding: "16px 16px 10px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: barColor, textTransform: "uppercase", letterSpacing: 2 }}>{cat.label}</span>
                        <span style={{ fontSize: 28, fontWeight: 900, color: barColor, lineHeight: 1 }}>{avg || "—"}</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${avg > 0 ? (avg / 5) * 100 : 0}%`, background: barColor, borderRadius: 2 }} />
                      </div>
                      {cat.items.map((item, i) => {
                        const v = Number((r.cats || {})[`${ck}_${i}`] || 0);
                        const vColor = v > 0 ? tapColor(v) : "#2A2E48";
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, gap: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: v > 0 ? vColor : "#2A2E48", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "#A4A8C0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: v > 0 ? vColor : "#2A2E48", flexShrink: 0 }}>{v || "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {/* Temporal assessments */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[["avImediata","IMEDIATA"],["avMedioPrazo","MÉDIO PRAZO"],["avLongoPrazo","LONGO PRAZO"]].map(([k, l]) => {
                  const val = r[k] || 0;
                  const vColor = val > 0 ? tapColor(val) : "#383D5C";
                  return (
                    <div key={k} style={{ background: "#0B0D1A", border: `1px solid #2A2E48`, borderRadius: 10, padding: "14px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{l}</div>
                      <div style={{ fontSize: 48, fontWeight: 900, color: val > 0 ? vColor : "#383D5C", lineHeight: 1 }}>{val || "—"}</div>
                      <div style={{ fontSize: 11, color: "#5E6383" }}>/ 5</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background: "#161929", border: `1px solid ${S.border}`, borderRadius: 16, padding: "20px 20px 12px 20px", marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minHeight: 0 }}>
              <div style={{ fontSize: 12, color: "#5E6383", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, alignSelf: "flex-start" }}>
                ATRIBUTOS {posMeta && `· ${posMeta.label}`}
              </div>
              <div style={{ width: 460, height: 460 }}>
                <ShareRadar labels={attrs} values={attrs.map(a => r.atr[a] || 0)} size={460} color={S.red} labelColor="#A4A8C0" valueColor={S.red} gridColor="#383D5C" />
              </div>
            </div>
          )}

          {/* DECISION BAR — formação only (stories card has no vertical room for senior) */}
          {r.mode !== "senior" && decObj && (
            <div style={{ padding: "22px 0", background: decObj.color, borderRadius: 16, textAlign: "center", fontSize: 34, fontWeight: 900, letterSpacing: 4, color: "#fff", marginBottom: 14 }}>
              {decObj.label}
            </div>
          )}

          {/* FOOTER */}
          <div style={{ fontSize: 14, color: "#5E6383", textAlign: "center", marginTop: "auto", paddingTop: 12 }}>
            scouting.sportrail.pt
          </div>
        </div>

        {/* Legacy ref for backward compat (points to square) */}
        <div ref={shareRef} style={{ display: "none" }} />
      </div>

      {/* ── UNDO DELETE SNACKBAR ── */}
      {undoToast && (
        <div className="no-print" style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1F2338", border: "1px solid #383D5C", borderRadius: 10,
          padding: "12px 18px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)", zIndex: 9999, whiteSpace: "nowrap",
          animation: "slideUpCenter 0.2s ease-out"
        }}>
          <span style={{ fontSize: 13, color: "#A4A8C0" }}>
            Relatório <strong style={{ color: "#fff" }}>{undoToast.report.nome || "Sem nome"}</strong> apagado
          </span>
          <button onClick={undoDelete} style={{
            padding: "6px 14px", background: S.red, color: "#fff", border: "none",
            borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}>Desfazer</button>
        </div>
      )}

      {/* ── SAVE TOAST (Ctrl+S) ── */}
      {saveToast && (
        <div className="no-print" style={{
          position: "fixed", bottom: 24, right: 24,
          background: "#1F2338", border: "1px solid #22c55e", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, color: "#22c55e", fontWeight: 600,
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)", zIndex: 9999,
          animation: "slideUpRight 0.2s ease-out"
        }}>
          ✓ Guardado
        </div>
      )}

      <style>{`
        @keyframes slideUpCenter {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes slideUpRight {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ---------- TapRating: half-step buttons 1–5 (mobile-friendly) ----------
function TapRating({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 5, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#A4A8C0", lineHeight: 1.4 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: value ? tapColor(value) : "#5E6383", flexShrink: 0, marginLeft: 8 }}>{value || "—"}</span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {TAP_VALS.map(v => (
          <button key={v} type="button" onClick={() => onChange(value === v ? 0 : v)} style={{
            flex: 1, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
            background: value === v ? tapColor(v) : "rgba(255,255,255,0.05)",
            color: value === v ? "white" : "rgba(255,255,255,0.2)",
            fontSize: 9, fontWeight: 700, transition: "all 0.1s", padding: 0,
            WebkitTapHighlightColor: "transparent"
          }}>{v}</button>
        ))}
      </div>
    </div>
  );
}

// ---------- v12: ShareRadar (SVG radar chart for share cards) ----------
function ShareRadar({ labels, values, size = 280, color = "#DDB85C", labelColor = "#A4A8C0", valueColor = "#DDB85C", gridColor = "#383D5C" }) {
  const N = labels.length;
  if (N < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;
  const labelRadius = radius + size * 0.11;

  // Concentric polygon levels
  const levels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = levels.map(level => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      pts.push(`${cx + Math.cos(angle) * radius * level},${cy + Math.sin(angle) * radius * level}`);
    }
    return pts.join(" ");
  });

  // Axes
  const axes = [];
  for (let i = 0; i < N; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    axes.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    });
  }

  // Data polygon
  const dataPoints = labels.map((_, i) => {
    const v = Math.max(0, Math.min(10, Number(values[i] || 0))) / 10;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    return {
      x: cx + Math.cos(angle) * radius * v,
      y: cy + Math.sin(angle) * radius * v,
      val: Number(values[i] || 0)
    };
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  // Label positions
  const labelPositions = labels.map((lbl, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const lx = cx + Math.cos(angle) * labelRadius;
    const ly = cy + Math.sin(angle) * labelRadius;
    let anchor = "middle";
    if (Math.cos(angle) > 0.3) anchor = "start";
    else if (Math.cos(angle) < -0.3) anchor = "end";
    return { lx, ly, anchor, lbl, val: Number(values[i] || 0) };
  });

  const pad = Math.round(size * 0.22);
  return (
    <svg viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`} style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Grid polygons */}
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke={gridColor} strokeWidth="1" opacity={0.5 + i * 0.1} />
      ))}
      {/* Axes */}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke={gridColor} strokeWidth="1" opacity="0.4" />
      ))}
      {/* Data polygon fill */}
      <polygon points={dataPolygon} fill={color} fillOpacity="0.35" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Vertex dots */}
      {dataPoints.map((p, i) => p.val > 0 && (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="1.5" />
      ))}
      {/* Labels */}
      {labelPositions.map((p, i) => (
        <g key={i}>
          <text x={p.lx} y={p.ly} fontSize={size * 0.04} fill={labelColor} textAnchor={p.anchor} dominantBaseline="middle" fontWeight="500">
            {p.lbl.length > 14 ? p.lbl.substring(0, 13) + "…" : p.lbl}
          </text>
          <text x={p.lx} y={p.ly + size * 0.05} fontSize={size * 0.045} fill={valueColor} textAnchor={p.anchor} dominantBaseline="middle" fontWeight="800">
            {p.val}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------- v8: SharePitch (non-interactive for share card) ----------
function SharePitch({ selected, secondary, positions }) {
  const W = 316;
  const H = 410;
  const line = "#383D5C";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <rect x="0" y="0" width={W} height={H} fill="#0f1a12" rx="6" />
      <rect x="8" y="8" width={W-16} height={H-16} fill="none" stroke={line} strokeWidth="1.5" rx="2" />
      <line x1="8" y1={H/2} x2={W-8} y2={H/2} stroke={line} strokeWidth="1.5" />
      <circle cx={W/2} cy={H/2} r="30" fill="none" stroke={line} strokeWidth="1.5" />
      <circle cx={W/2} cy={H/2} r="2" fill={line} />
      <rect x={W/2 - 65} y="8" width="130" height="48" fill="none" stroke={line} strokeWidth="1.5" />
      <rect x={W/2 - 28} y="8" width="56" height="17" fill="none" stroke={line} strokeWidth="1.5" />
      <rect x={W/2 - 65} y={H - 56} width="130" height="48" fill="none" stroke={line} strokeWidth="1.5" />
      <rect x={W/2 - 28} y={H - 25} width="56" height="17" fill="none" stroke={line} strokeWidth="1.5" />

      {(positions || FORMACAO_POSITIONS).map(p => {
        const isMain = p.code === selected;
        const isSec = p.code === secondary;
        if (!isMain && !isSec) return null;
        const cx = 20 + p.x * (W - 40);
        const cy = 20 + p.y * (H - 40);
        const fill = isMain ? "#DDB85C" : "#eab308";
        return (
          <g key={p.code}>
            <circle cx={cx} cy={cy} r={22} fill={fill} stroke="#fff" strokeWidth={2.5} />
            <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="800">{p.code}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- v7b: Pitch (interactive SVG) ----------
function Pitch({ selected, secondary, onSelect, positions }) {
  const W = 340;
  const H = 440;
  const line = "#383D5C";
  const grass1 = "#0f1a12";
  const grass2 = "#0c1610";

  return (
    <div style={{ background: "#1F2338", borderRadius: 10, padding: 12, border: "1px solid #2A2E48" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto" }}>
        <defs>
          <pattern id="sprGrass" width={W} height={H/8} patternUnits="userSpaceOnUse">
            <rect width={W} height={H/16} fill={grass1} />
            <rect y={H/16} width={W} height={H/16} fill={grass2} />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#sprGrass)" rx="6" />
        <rect x="8" y="8" width={W-16} height={H-16} fill="none" stroke={line} strokeWidth="1.5" rx="2" />
        <line x1="8" y1={H/2} x2={W-8} y2={H/2} stroke={line} strokeWidth="1.5" />
        <circle cx={W/2} cy={H/2} r="32" fill="none" stroke={line} strokeWidth="1.5" />
        <circle cx={W/2} cy={H/2} r="2" fill={line} />
        {/* Attacking goal area (top) */}
        <rect x={W/2 - 70} y="8" width="140" height="50" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x={W/2 - 30} y="8" width="60" height="18" fill="none" stroke={line} strokeWidth="1.5" />
        <circle cx={W/2} cy="38" r="1.5" fill={line} />
        {/* Own goal area (bottom, where GR is) */}
        <rect x={W/2 - 70} y={H - 58} width="140" height="50" fill="none" stroke={line} strokeWidth="1.5" />
        <rect x={W/2 - 30} y={H - 26} width="60" height="18" fill="none" stroke={line} strokeWidth="1.5" />
        <circle cx={W/2} cy={H - 38} r="1.5" fill={line} />
        {/* Attack direction arrow */}
        <g opacity="0.3">
          <line x1={W - 24} y1={H - 40} x2={W - 24} y2="40" stroke="#5E6383" strokeWidth="1" strokeDasharray="2 2" />
          <polygon points={`${W-28},48 ${W-20},48 ${W-24},38`} fill="#5E6383" />
        </g>

        {(positions || FORMACAO_POSITIONS).map(p => {
          const cx = 20 + p.x * (W - 40);
          const cy = 20 + p.y * (H - 40);
          const isMain = p.code === selected;
          const isSec = p.code === secondary;
          const fill = isMain ? "#DDB85C" : (isSec ? "#eab308" : "#2A2E48");
          const stroke = isMain ? "#fff" : (isSec ? "#fff" : "#5E6383");
          const rad = isMain ? 18 : (isSec ? 16 : 13);
          return (
            <g key={p.code} style={{ cursor: "pointer" }} onClick={() => onSelect(p.code)}>
              <circle cx={cx} cy={cy} r={rad} fill={fill} stroke={stroke} strokeWidth={isMain || isSec ? 2 : 1} />
              <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize={isMain ? 11 : 9} fontWeight="800" style={{ pointerEvents: "none" }}>{p.code}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: "center", fontSize: 10, color: "#5E6383", marginTop: 6, display: "flex", justifyContent: "center", gap: 14 }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#DDB85C", marginRight: 4, verticalAlign: "middle" }} />Principal</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#eab308", marginRight: 4, verticalAlign: "middle" }} />Secundária</span>
      </div>
    </div>
  );
}

// ---------- v8.2: helpers for PDF drawing ----------
function drawStar(doc, cx, cy, r, color) {
  // 5-point star using lines/triangles
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  doc.setFillColor(...color);
  // jsPDF doesn't have polygon() directly; use lines() with a starting point
  const lines = [];
  for (let i = 1; i < points.length; i++) {
    lines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
  }
  lines.push([points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]]);
  doc.lines(lines, points[0][0], points[0][1], [1, 1], "F", true);
}

// v11: Radar chart for PDF (native jsPDF drawing)
function drawRadarChart(doc, cx, cy, radius, labels, values, colors) {
  // colors: { grid, axis, fill, stroke, vertex, label, labelBg }
  const N = labels.length;
  if (N < 3) return;

  // Grid: 4 concentric polygons at 25/50/75/100%
  doc.setDrawColor(...colors.grid);
  doc.setLineWidth(0.15);
  for (const level of [0.25, 0.5, 0.75, 1.0]) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      pts.push([
        cx + Math.cos(angle) * radius * level,
        cy + Math.sin(angle) * radius * level
      ]);
    }
    // Draw polygon outline
    for (let i = 0; i < N; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % N];
      doc.line(a[0], a[1], b[0], b[1]);
    }
  }

  // Axes from center to outer vertices
  doc.setDrawColor(...colors.axis);
  doc.setLineWidth(0.15);
  for (let i = 0; i < N; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    doc.line(cx, cy, x, y);
  }

  // Data polygon (red fill with lines())
  const dataPts = [];
  for (let i = 0; i < N; i++) {
    const v = Math.max(0, Math.min(10, Number(values[i] || 0))) / 10;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    dataPts.push([
      cx + Math.cos(angle) * radius * v,
      cy + Math.sin(angle) * radius * v
    ]);
  }
  // Filled polygon with partial opacity (using GState, jsPDF official alpha API)
  const relLines = [];
  for (let i = 1; i < N; i++) {
    relLines.push([dataPts[i][0] - dataPts[i - 1][0], dataPts[i][1] - dataPts[i - 1][1]]);
  }
  relLines.push([dataPts[0][0] - dataPts[N - 1][0], dataPts[0][1] - dataPts[N - 1][1]]);
  doc.setFillColor(...colors.fill);
  doc.setDrawColor(...colors.stroke);
  doc.setLineWidth(0.5);
  // Apply 35% opacity for fill, then draw with fill+stroke
  let hasGState = false;
  try {
    if (typeof doc.GState === "function") {
      doc.setGState(new doc.GState({ opacity: 0.35 }));
      hasGState = true;
    }
  } catch (e) { /* jsPDF version without GState; fallback to solid */ }
  doc.lines(relLines, dataPts[0][0], dataPts[0][1], [1, 1], "F", true);
  // Restore full opacity and draw outline
  if (hasGState) {
    try { doc.setGState(new doc.GState({ opacity: 1 })); } catch (e) {}
  }
  doc.lines(relLines, dataPts[0][0], dataPts[0][1], [1, 1], "S", true);

  // Vertex dots (only where value > 0)
  doc.setFillColor(...colors.vertex);
  for (let i = 0; i < N; i++) {
    const v = Number(values[i] || 0);
    if (v <= 0) continue;
    const p = dataPts[i];
    doc.circle(p[0], p[1], 0.6, "F");
  }

  // Labels outside the polygon
  doc.setFontSize(6);
  doc.setTextColor(...colors.label);
  doc.setFont("helvetica", "normal");
  for (let i = 0; i < N; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const labelRadius = radius + 3.5;
    const x = cx + Math.cos(angle) * labelRadius;
    const y = cy + Math.sin(angle) * labelRadius + 0.8;
    // Truncate long labels
    let lbl = labels[i];
    if (lbl.length > 14) lbl = lbl.substring(0, 12) + "..";
    const align = Math.abs(Math.cos(angle)) < 0.2 ? "center" : (Math.cos(angle) > 0 ? "left" : "right");
    doc.text(lbl, x, y, { align });
    // Value in red next to label
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.stroke);
    const valueOffset = align === "right" ? -1 : (align === "left" ? 1 : 0);
    doc.text(String(Number(values[i] || 0)), x + valueOffset, y + 2.5, { align });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.label);
  }
}

// ---------- v8: Native PDF generator (jsPDF direct, searchable text) ----------
function generateNativePDF(jsPDF, r, attrs, dims, media, autoNota, age, contract, posMeta, decObj) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Page setup: A4 = 210 x 297 mm
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 14; // margin

  // Sportrail colors
  const RED = [221, 184, 92];
  const BG = [11, 13, 26];
  const PANEL = [19, 18, 26];
  const BORDER = [42, 42, 47];
  const TEXT = [245, 245, 245];
  const MUTED = [153, 153, 153];
  const DIM = [102, 102, 102];
  const GREEN = [34, 197, 94];
  const YELLOW = [234, 179, 8];
  const REDLT = [196, 104, 104];
  const pdfSliderColor = (v) => v >= 8 ? GREEN : v >= 5 ? YELLOW : v > 0 ? REDLT : BORDER;
  const pdfTapColor = (v) => v >= 4 ? GREEN : v >= 2.5 ? YELLOW : v > 0 ? REDLT : BORDER;

  // Paint page background
  doc.setFillColor(...BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  let y = M;

  // ===== HEADER BAR =====
  doc.setFillColor(...RED);
  doc.rect(M, y, PAGE_W - 2 * M, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SPORTRAIL", M + 3, y + 7);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("SCOUTING REPORT", PAGE_W - M - 3, y + 7, { align: "right" });
  y += 14;

  // ===== PLAYER CARD =====
  // Photo (if exists)
  const photoX = M;
  const photoY = y;
  const photoW = 32;
  const photoH = 32;

  if (r.foto) {
    try {
      doc.addImage(r.foto, "JPEG", photoX, photoY, photoW, photoH, undefined, "FAST");
    } catch (e) {
      doc.setFillColor(...PANEL);
      doc.rect(photoX, photoY, photoW, photoH, "F");
    }
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.6);
    doc.rect(photoX, photoY, photoW, photoH);
  } else {
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.6);
    doc.rect(photoX, photoY, photoW, photoH, "FD");
    // Initials
    const initials = (r.nome || "?").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(initials, photoX + photoW / 2, photoY + photoH / 2 + 3, { align: "center" });
  }

  // Name + info
  const infoX = photoX + photoW + 5;
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(r.nome || "—", infoX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const line2 = [r.clube, posMeta?.label || r.pos, `Pé ${r.pe}`].filter(Boolean).join(" · ") || "—";
  doc.text(line2, infoX, y + 12);

  doc.setFontSize(9);
  doc.setTextColor(...DIM);
  const line3 = [r.nacionalidade, age != null && `${age} anos`, r.altura && `${r.altura} cm`, r.peso && `${r.peso} kg`].filter(Boolean).join(" · ");
  if (line3) doc.text(line3, infoX, y + 17);

  // Season stats mini
  const statsY = y + 22;
  const statW = 24;
  const statGap = 2;
  const stats = [
    { label: "JOGOS", value: r.jogos || "—", color: TEXT },
    { label: "GOLOS", value: r.golos || "—", color: RED },
    { label: "ASSIST.", value: r.assists || "—", color: GREEN }
  ];
  stats.forEach((s, i) => {
    const sx = infoX + i * (statW + statGap);
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(sx, statsY, statW, 10, "FD");
    doc.setFontSize(6);
    doc.setTextColor(...DIM);
    doc.setFont("helvetica", "normal");
    doc.text(s.label, sx + statW / 2, statsY + 3, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(...s.color);
    doc.setFont("helvetica", "bold");
    doc.text(String(s.value), sx + statW / 2, statsY + 8, { align: "center" });
  });

  // Nota box (right)
  const notaX = PAGE_W - M - 32;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(notaX - 2, y, notaX - 2, y + photoH);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("NOTA", notaX + 16, y + 4, { align: "center" });
  doc.setFontSize(36);
  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.text(String(autoNota || r.nota || "—"), notaX + 16, y + 20, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(...DIM);
  doc.setFont("helvetica", "normal");
  doc.text(r.mode === "senior" ? "/ 5" : "/ 10", notaX + 16, y + 24, { align: "center" });
  if (r.potencial || r.rendimento) {
    let badgeY = y + 28;
    if (r.potencial) {
      doc.setFillColor(...RED);
      doc.roundedRect(notaX + 3, badgeY, 26, 5, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(r.potencial, notaX + 16, badgeY + 3.5, { align: "center" });
      badgeY += 7;
    }
    if (r.rendimento) {
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(notaX + 3, badgeY, 26, 5, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(r.rendimento, notaX + 16, badgeY + 3.5, { align: "center" });
    }
  }

  y += photoH + 6;

  // ===== SECTION: IDENTIFICAÇÃO =====
  const section = (title) => {
    doc.setFillColor(...RED);
    doc.rect(M, y, 1.5, 5, "F");
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), M + 3, y + 4);
    y += 7;
  };

  const field = (label, value, col, colW) => {
    doc.setFontSize(6);
    doc.setTextColor(...DIM);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), col, y);
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.rect(col, y + 1, colW, 5.5, "FD");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const val = value || "—";
    const text = doc.splitTextToSize(String(val), colW - 2)[0];
    doc.text(text || "—", col + 1, y + 5);
  };

  section("Identificação");
  y += 2;
  const contentW = PAGE_W - 2 * M;
  const colW = (contentW - 6) / 3;
  const rowH = 10;

  // Row 1
  field("Data nascimento", r.dataNasc, M, colW);
  field("Naturalidade", r.naturalidade, M + colW + 3, colW);
  field("Nacionalidade", r.nacionalidade, M + 2 * (colW + 3), colW);
  y += rowH;

  // Row 2
  field("Clube atual", r.clube, M, colW);
  field("Contrato até", r.contratoAte + (contract ? ` (${contract.label})` : ""), M + colW + 3, colW);
  field("Agente", r.agente, M + 2 * (colW + 3), colW);
  y += rowH;

  // Row 3
  field("Posição principal", (posMeta?.label) || r.pos, M, colW);
  field("Posição secundária", r.posSec ? ((r.mode === "senior" ? SENIOR_POSITIONS : FORMACAO_POSITIONS).find(p => p.code === r.posSec)?.label || r.posSec) : "", M + colW + 3, colW);
  field("Pé", r.pe, M + 2 * (colW + 3), colW);
  y += rowH;

  // Row 4
  field("Altura", r.altura ? r.altura + " cm" : "", M, colW);
  field("Peso", r.peso ? r.peso + " kg" : "", M + colW + 3, colW);
  y += rowH + 2;

  if (r.percurso) {
    field("Percurso", r.percurso, M, contentW);
    y += rowH;
  }

  if (r.mode === "senior") {
    // ===== SECTION: CATEGORIAS SÉNIOR (4 × barra + média) =====
    const posCats = SENIOR_CATS[r.pos] || SENIOR_CATS.MC;
    section("Categorias — " + (posMeta?.label || r.pos));
    const catKeys = Object.keys(posCats);
    const catBarH = 4;
    const catLabelW = 40;
    const catBarMaxW = contentW - catLabelW - 20;
    const itemRowH = 3.5; // height per item row
    const itemColW = (contentW - 6) / 2; // 2 columns
    catKeys.forEach(ck => {
      const cat = posCats[ck];
      const itemVals = cat.items.map((item, i) => ({ item, v: Number((r.cats || {})[`${ck}_${i}`] || 0) }));
      const vals = itemVals.map(iv => iv.v).filter(v => v > 0);
      const avg = vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
      const barColor = pdfTapColor(avg);
      // Category label
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "bold");
      doc.text(cat.label, M, y + 3);
      // Bar bg
      doc.setFillColor(...PANEL);
      doc.rect(M + catLabelW, y, catBarMaxW, catBarH, "F");
      // Bar fill
      if (avg > 0) {
        doc.setFillColor(...barColor);
        doc.rect(M + catLabelW, y, catBarMaxW * (avg / 5), catBarH, "F");
      }
      // Value
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...barColor);
      doc.setFontSize(9);
      doc.text(avg > 0 ? String(avg) : "—", M + catLabelW + catBarMaxW + 3, y + 3);
      y += 6;
      // Individual items — 2 columns
      for (let row = 0; row < Math.ceil(itemVals.length / 2); row++) {
        [0, 1].forEach(col => {
          const idx = row * 2 + col;
          if (idx >= itemVals.length) return;
          const { item, v } = itemVals[idx];
          const ix = M + col * (itemColW + 6);
          const vColor = v > 0 ? pdfTapColor(v) : DIM;
          // Dot indicator
          doc.setFillColor(...(v > 0 ? vColor : BORDER));
          doc.circle(ix + 1.5, y + 1.5, 1, "F");
          // Item label
          doc.setFontSize(6.5);
          doc.setTextColor(...TEXT);
          doc.setFont("helvetica", "normal");
          const label = item.length > 32 ? item.substring(0, 30) + ".." : item;
          doc.text(label, ix + 4, y + 2.5);
          // Value
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...(v > 0 ? vColor : DIM));
          doc.setFontSize(7);
          doc.text(v > 0 ? String(v) : "—", ix + itemColW - 2, y + 2.5, { align: "right" });
        });
        y += itemRowH;
      }
      y += 3; // spacing between categories
    });
    // Nota média overall
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Nota média: ", M, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED);
    doc.setFontSize(10);
    doc.text(String(autoNota || "—"), M + 22, y + 2);
    y += 8;

    // ===== SECTION: DECISÃO SÉNIOR =====
    section("Decisão Sénior");
    // Classificação + Decisão side by side
    const halfDecW = (contentW - 4) / 2;
    // Classificação
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(M, y, halfDecW, 14, "FD");
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("CLASSIFICAÇÃO", M + 3, y + 4);
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "bold");
    doc.text(r.classificacao || "—", M + 3, y + 11);
    // Decisão
    const decColX = M + halfDecW + 4;
    const senDecColor = r.decisao === "CONTRATAR JÁ" ? GREEN : r.decisao === "CONTRATAR" ? [34, 197, 94] : r.decisao === "MONITORIZAR" ? [234, 179, 8] : r.decisao === "REJEITAR" ? REDLT : PANEL;
    doc.setFillColor(...senDecColor);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(decColX, y, halfDecW, 14, "FD");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.text("DECISÃO", decColX + 3, y + 4);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(r.decisao || "—", decColX + 3, y + 11);
    y += 18;

    // Temporal assessments
    const avKeys = [["avImediata","IMEDIATA"],["avMedioPrazo","MÉDIO PRAZO"],["avLongoPrazo","LONGO PRAZO"]];
    const avW = (contentW - 8) / 3;
    avKeys.forEach(([k, l], i) => {
      const val = r[k] || 0;
      const avX = M + i * (avW + 4);
      const avColor = pdfTapColor(val);
      doc.setFillColor(...PANEL);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.rect(avX, y, avW, 16, "FD");
      doc.setFontSize(6);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(l, avX + avW / 2, y + 4, { align: "center" });
      doc.setFontSize(16);
      doc.setTextColor(...(val > 0 ? avColor : BORDER));
      doc.setFont("helvetica", "bold");
      doc.text(String(val || "—"), avX + avW / 2, y + 12, { align: "center" });
    });
    y += 20;

  } else {
    // ===== SECTION: ATRIBUTOS (formação: bars + radar) =====
    section("Atributos" + (posMeta ? ` (${posMeta.label})` : ""));

    const barH = 3.5;
    const radarW = 60;
    const barsColW = contentW - radarW - 6;
    const barLabelW = 40;
    const barMaxW = barsColW - barLabelW - 12;
    const attrsStartY = y;

    attrs.forEach(a => {
      const val = r.atr[a] || 0;
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.setFont("helvetica", "normal");
      const label = a.length > 18 ? a.substring(0, 16) + ".." : a;
      doc.text(label, M, y + 2.5);
      const atrColor = pdfSliderColor(val);
      doc.setFillColor(...PANEL);
      doc.rect(M + barLabelW, y, barMaxW, barH, "F");
      if (val > 0) {
        doc.setFillColor(...atrColor);
        doc.rect(M + barLabelW, y, barMaxW * (val / 10), barH, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(val > 0 ? atrColor : DIM));
      doc.setFontSize(8);
      doc.text(String(val), M + barsColW - 1, y + 2.5, { align: "right" });
      y += 5;
    });

    const afterBarsY = y;
    y += 1;
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Média: ", M, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED);
    doc.setFontSize(10);
    doc.text(String(media), M + 13, y + 2);

    const radarCx = M + barsColW + 6 + radarW / 2;
    const radarCy = attrsStartY + (afterBarsY - attrsStartY) / 2;
    const radarR = Math.min(radarW / 2 - 4, (afterBarsY - attrsStartY) / 2 - 2);
    if (radarR >= 12 && attrs.length >= 3) {
      drawRadarChart(doc, radarCx, radarCy, radarR, attrs, attrs.map(a => r.atr[a] || 0), {
        grid: BORDER, axis: BORDER, fill: RED, stroke: RED, vertex: [255, 255, 255], label: MUTED
      });
    }

    y += 8;

    // ===== SECTION: DIMENSÕES (formação: 4 pillars FM-style) =====
    section("Dimensões");

    const pillarGap = 4;
    const pillarW = (contentW - pillarGap * (dims.length - 1)) / dims.length;
    const pillarH = 22;

    dims.forEach((d, i) => {
      const val = Number(r.dim[d] || 0);
      const px = M + i * (pillarW + pillarGap);
      doc.setFillColor(...PANEL);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.rect(px, y, pillarW, pillarH, "FD");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(d.toUpperCase(), px + pillarW / 2, y + 4, { align: "center" });
      doc.setFontSize(20);
      const pillarColor = pdfSliderColor(val);
      doc.setTextColor(...(val > 0 ? pillarColor : BORDER));
      doc.setFont("helvetica", "bold");
      doc.text(String(val), px + pillarW / 2, y + 13, { align: "center" });
      const mbPad = 2.5;
      const mbY = y + pillarH - 3;
      const mbW = pillarW - mbPad * 2;
      doc.setFillColor(...BORDER);
      doc.rect(px + mbPad, mbY, mbW, 1.2, "F");
      if (val > 0) {
        doc.setFillColor(...pillarColor);
        doc.rect(px + mbPad, mbY, mbW * (val / 10), 1.2, "F");
      }
    });

    y += pillarH + 6;
  }

  // ===== SECTION: PONTOS FORTES / LACUNAS — boxed panels =====
  // Page break if needed (senior mode has more content)
  if (y > PAGE_H - 60) {
    doc.addPage();
    doc.setFillColor(...BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    y = M + 4;
  }
  const halfW = (contentW - 4) / 2;
  const bPad = 4;
  const lineH = 5;
  const fortes = (r.fortes || []).filter(Boolean);
  const lacunas = (r.lacunas || []).filter(Boolean);

  // Measure content height for each side (items may wrap)
  const measureH = (items, colW) => items.reduce((h, item) => {
    return h + doc.splitTextToSize(item, colW - bPad * 2 - 3).length * lineH;
  }, 0);
  const contentInnerW = halfW - bPad * 2 - 3;
  const fortesH = measureH(fortes, halfW);
  const lacunasH = measureH(lacunas, halfW);
  const boxH = Math.max(fortesH, lacunasH, lineH) + bPad * 2 + 9; // 9 = label row height

  // --- PONTOS FORTES box ---
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.rect(M, y, halfW, boxH, "FD");
  doc.setFillColor(...GREEN);
  doc.rect(M, y, halfW, 2, "F"); // green top bar
  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("PONTOS FORTES", M + bPad, y + 7);
  let fy = y + 13;
  fortes.forEach(f => {
    doc.setFillColor(...GREEN);
    doc.triangle(M + bPad, fy - 1.8, M + bPad, fy + 0.2, M + bPad + 1.6, fy - 0.8, "F");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    const fl = doc.splitTextToSize(f, contentInnerW);
    doc.text(fl, M + bPad + 3, fy);
    fy += fl.length * lineH;
  });

  // --- LACUNAS box ---
  const lx = M + halfW + 4;
  doc.setFillColor(...PANEL);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.rect(lx, y, halfW, boxH, "FD");
  doc.setFillColor(...REDLT);
  doc.rect(lx, y, halfW, 2, "F"); // red top bar
  doc.setFontSize(7);
  doc.setTextColor(...REDLT);
  doc.setFont("helvetica", "bold");
  doc.text("LACUNAS", lx + bPad, y + 7);
  let ly = y + 13;
  lacunas.forEach(l => {
    doc.setFillColor(...REDLT);
    doc.triangle(lx + bPad, ly - 1.8, lx + bPad, ly + 0.2, lx + bPad + 1.6, ly - 0.8, "F");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    const ll = doc.splitTextToSize(l, contentInnerW);
    doc.text(ll, lx + bPad + 3, ly);
    ly += ll.length * lineH;
  });

  y += boxH + 4;

  // ===== SECTION: PARECER =====
  if (r.parecer) {
    // Page break if Parecer won't fit on remaining page
    if (y > PAGE_H - 55) {
      doc.addPage();
      doc.setFillColor(...BG);
      doc.rect(0, 0, PAGE_W, PAGE_H, "F");
      y = M + 4;
    }
    section("Parecer");
    const parLines = doc.splitTextToSize(r.parecer, contentW - 8);
    const parBoxH = parLines.length * 4.5 + 8;
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.rect(M, y, contentW, parBoxH, "FD");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    doc.text(parLines, M + 4, y + 5);
    y += parBoxH + 4;
  }

  // ===== DECISION BAR =====
  if (r.mode !== "senior" && decObj) {
    const decColor = decObj.id === "contratar" ? GREEN : decObj.id === "sem_interesse" ? REDLT : [234, 179, 8];
    doc.setFillColor(...decColor);
    doc.rect(M, y, contentW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(decObj.label, PAGE_W / 2, y + 7, { align: "center" });
    y += 14;
  }

  // ===== FOOTER =====
  const footerY = PAGE_H - 8;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(M, footerY - 3, PAGE_W - M, footerY - 3);
  doc.setFontSize(7);
  doc.setTextColor(...DIM);
  doc.setFont("helvetica", "normal");
  doc.text(r.scout || "—", M, footerY);
  doc.text(r.dataRel || "—", PAGE_W / 2, footerY, { align: "center" });
  doc.text("sportrail.pt", PAGE_W - M, footerY, { align: "right" });

  doc.save(`scouting-${r.nome || "relatorio"}.pdf`);
}

// ---------- v6: PDF print-ready HTML builder ----------
function buildPrintHTML(r, attrs, dims, radarData, barData, media, decObj) {
  const A4_W = 794; // px at 96dpi for 210mm
  const pad = 40;
  const RED = "#DDB85C";
  const BG = "#0B0D1A";
  const PANEL = "#161929";
  const BORDER = "#2A2E48";

  const el = document.createElement("div");
  el.style.cssText = `
    width: ${A4_W}px;
    background: ${BG};
    color: #E8EAF2;
    font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    padding: ${pad}px;
    box-sizing: border-box;
  `;

  const esc = (s) => {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  };

  const h2 = (txt) => `<h2 style="font-size:15px;text-transform:uppercase;letter-spacing:1px;border-left:4px solid ${RED};padding-left:10px;margin:0 0 12px 0;color:#fff;">${esc(txt)}</h2>`;

  const field = (label, value) => `
    <div style="margin-bottom:8px;">
      <div style="font-size:8px;text-transform:uppercase;color:#A4A8C0;letter-spacing:0.5px;margin-bottom:2px;">${esc(label)}</div>
      <div style="font-size:11px;color:#fff;padding:6px 8px;background:${PANEL};border:1px solid ${BORDER};border-radius:4px;min-height:14px;">${esc(value) || "—"}</div>
    </div>`;

  // --- HEADER BAR ---
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid ${RED};padding-bottom:12px;">
      <div style="font-size:22px;font-weight:900;color:${RED};letter-spacing:1.5px;">SPORTRAIL</div>
      <div style="font-size:10px;color:#5E6383;text-transform:uppercase;letter-spacing:1px;">Scouting Report</div>
    </div>`;

  // --- PLAYER TOP CARD ---
  const photoHTML = r.foto
    ? `<img src="${r.foto}" style="width:100px;height:100px;border-radius:8px;object-fit:cover;border:2px solid ${RED};" />`
    : `<div style="width:100px;height:100px;border-radius:8px;background:${PANEL};border:2px solid ${RED};display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:${RED};">${esc((r.nome || "?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase())}</div>`;

  const topCard = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="width:110px;vertical-align:top;padding:0;">${photoHTML}</td>
        <td style="vertical-align:top;padding:0 0 0 14px;">
          <div style="font-size:22px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:4px;">${esc(r.nome) || "—"}</div>
          <div style="font-size:12px;color:#A4A8C0;margin-bottom:3px;">${[r.clube, r.pos, r.pe].filter(Boolean).map(esc).join(" · ") || "—"}</div>
          <div style="font-size:10px;color:#5E6383;">${[r.nacionalidade, r.altura && `${r.altura}cm`, r.peso && `${r.peso}kg`].filter(Boolean).map(esc).join(" · ") || "—"}</div>
        </td>
        <td style="width:100px;vertical-align:top;text-align:center;padding:0;border-left:1px solid ${BORDER};">
          <div style="font-size:9px;color:#5E6383;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Nota</div>
          <div style="font-size:52px;font-weight:900;color:${RED};line-height:1;">${esc(r.nota) || "—"}</div>
          <div style="font-size:9px;color:#5E6383;">/ 10</div>
        </td>
      </tr>
    </table>`;

  // --- IDENTIFICAÇÃO ---
  const idBlock = `
    <div style="margin-bottom:16px;">
      ${h2("Identificação")}
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:33.33%;padding:0 6px 0 0;vertical-align:top;">${field("Data nascimento", r.dataNasc)}</td>
          <td style="width:33.33%;padding:0 6px;vertical-align:top;">${field("Naturalidade", r.naturalidade)}</td>
          <td style="width:33.33%;padding:0 0 0 6px;vertical-align:top;">${field("Nacionalidade", r.nacionalidade)}</td>
        </tr>
        <tr>
          <td style="padding:0 6px 0 0;vertical-align:top;">${field("Clube atual", r.clube)}</td>
          <td style="padding:0 6px;vertical-align:top;">${field("Contrato até", r.contratoAte)}</td>
          <td style="padding:0 0 0 6px;vertical-align:top;">${field("Agente", r.agente)}</td>
        </tr>
        <tr>
          <td style="padding:0 6px 0 0;vertical-align:top;">${field("Posição principal", r.pos)}</td>
          <td style="padding:0 6px;vertical-align:top;">${field("Posição secundária", r.posSec)}</td>
          <td style="padding:0 0 0 6px;vertical-align:top;">${field("Pé", r.pe)}</td>
        </tr>
        <tr>
          <td style="padding:0 6px 0 0;vertical-align:top;">${field("Altura", r.altura ? r.altura + " cm" : "")}</td>
          <td style="padding:0 6px;vertical-align:top;">${field("Peso", r.peso ? r.peso + " kg" : "")}</td>
          <td style="padding:0 0 0 6px;vertical-align:top;"></td>
        </tr>
      </table>
      ${r.percurso ? `<div style="margin-top:4px;">${field("Percurso", r.percurso)}</div>` : ""}
    </div>`;

  // --- CONTEXTO ---
  const contextBlock = (r.data || r.comp || r.adv) ? `
    <div style="margin-bottom:16px;">
      ${h2("Contexto da Observação")}
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:25%;padding:0 4px 0 0;vertical-align:top;">${field("Data", r.data)}</td>
          <td style="width:25%;padding:0 4px;vertical-align:top;">${field("Competição", r.comp)}</td>
          <td style="width:25%;padding:0 4px;vertical-align:top;">${field("Adversário", r.adv)}</td>
          <td style="width:25%;padding:0 0 0 4px;vertical-align:top;">${field("Resultado", r.resultado)}</td>
        </tr>
        <tr>
          <td style="padding:0 4px 0 0;vertical-align:top;">${field("Min. observados", r.min)}</td>
          <td style="padding:0 4px;vertical-align:top;">${field("Sistema", r.sistema)}</td>
          <td colspan="2"></td>
        </tr>
      </table>
    </div>` : "";

  // --- ATRIBUTOS com barras horizontais ---
  const attrRows = attrs.map(a => {
    const val = r.atr[a] || 0;
    const pct = val * 10;
    return `
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
          <span style="color:#A4A8C0;">${esc(a)}</span>
          <span style="color:${RED};font-weight:700;">${val}</span>
        </div>
        <div style="height:6px;background:${PANEL};border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${RED};"></div>
        </div>
      </div>`;
  }).join("");

  const attrBlock = `
    <div style="margin-bottom:16px;">
      ${h2(`Atributos${r.mode === "senior" ? ` (${esc(r.pos)})` : ""}`)}
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td style="width:100%;vertical-align:top;padding:0;">
          ${attrRows}
          <div style="font-size:10px;color:#A4A8C0;margin-top:8px;border-top:1px solid ${BORDER};padding-top:6px;">
            Média: <span style="color:${RED};font-weight:700;font-size:14px;">${media}</span>
          </div>
        </td>
      </tr></table>
    </div>`;

  // --- DIMENSÕES ---
  const dimRows = dims.map(d => {
    const val = r.dim[d] || 0;
    const pct = val * 10;
    return `
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
          <span style="color:#A4A8C0;">${esc(d)}</span>
          <span style="color:${RED};font-weight:700;">${val}</span>
        </div>
        <div style="height:6px;background:${PANEL};border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${RED};"></div>
        </div>
      </div>`;
  }).join("");

  const dimBlock = `
    <div style="margin-bottom:16px;">
      ${h2("Dimensões")}
      ${dimRows}
    </div>`;

  // --- PONTOS FORTES / LACUNAS ---
  const fortesHTML = (r.fortes || []).filter(Boolean).map(f =>
    `<div style="font-size:11px;color:#fff;margin-bottom:4px;"><span style="color:#22c55e;margin-right:6px;">▸</span>${esc(f)}</div>`
  ).join("") || `<div style="font-size:10px;color:#5E6383;">—</div>`;

  const lacunasHTML = (r.lacunas || []).filter(Boolean).map(f =>
    `<div style="font-size:11px;color:#fff;margin-bottom:4px;"><span style="color:#C46868;margin-right:6px;">▸</span>${esc(f)}</div>`
  ).join("") || `<div style="font-size:10px;color:#5E6383;">—</div>`;

  const forcasBlock = `
    <div style="margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td style="width:50%;vertical-align:top;padding:0 8px 0 0;">
          <div style="font-size:10px;font-weight:800;color:#22c55e;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #22c55e;padding-bottom:4px;">Pontos Fortes</div>
          ${fortesHTML}
        </td>
        <td style="width:50%;vertical-align:top;padding:0 0 0 8px;">
          <div style="font-size:10px;font-weight:800;color:#C46868;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #C46868;padding-bottom:4px;">Lacunas</div>
          ${lacunasHTML}
        </td>
      </tr></table>
    </div>`;

  // --- PARECER ---
  const parecerBlock = r.parecer ? `
    <div style="margin-bottom:16px;">
      ${h2("Parecer")}
      <div><div style="font-size:8px;text-transform:uppercase;color:#A4A8C0;margin-bottom:3px;">Parecer final</div><div style="font-size:11px;color:#fff;background:${PANEL};border:1px solid ${BORDER};border-radius:4px;padding:8px;line-height:1.4;">${esc(r.parecer)}</div></div>
    </div>` : "";

  // --- DECISÃO ---
  const decBlock = decObj ? `
    <div style="margin-bottom:12px;padding:16px;background:${decObj.color};border-radius:8px;text-align:center;font-size:20px;font-weight:900;letter-spacing:2px;color:#fff;">
      ${esc(decObj.label)}
    </div>` : "";

  // --- FOOTER ---
  const footer = `
    <div style="margin-top:16px;padding-top:10px;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;font-size:9px;color:#5E6383;">
      <span>${esc(r.scout) || "—"}</span>
      <span>${esc(r.dataRel) || "—"}</span>
      <span>sportrail.pt</span>
    </div>`;

  el.innerHTML = header + topCard + idBlock + contextBlock + attrBlock + dimBlock + forcasBlock + parecerBlock + decBlock + footer;
  return el;
}

const menuBtn = {
  display: "block", width: "100%", textAlign: "left", padding: "12px 14px",
  background: "transparent", color: "#fff", border: "none", cursor: "pointer",
  fontSize: 12, borderBottom: `1px solid ${S.border}`
};
const menuBtnTitle = { fontSize: 12, fontWeight: 600, marginBottom: 2 };
const menuBtnSub = { fontSize: 10, color: "#5E6383" };

// ---------- v5 comparison helpers ----------
const headerCell = {
  padding: "16px 14px",
  background: "#1F2338",
  fontSize: 11,
  color: "#5E6383",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontWeight: 700
};

const compareRowStyle = {
  display: "grid",
  gridTemplateColumns: "inherit",
  borderBottom: `1px solid ${S.border}`
};

const compareLabelCell = {
  padding: "12px 14px",
  fontSize: 12,
  color: "#A4A8C0",
  background: "#161929",
  display: "flex",
  alignItems: "center",
  textTransform: "uppercase",
  letterSpacing: 0.3
};

const compareValueCell = {
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

function CompareSection({ title, cols, children }) {
  return (
    <div style={{ marginBottom: 18, background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", background: S.red, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#fff" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${cols}, 1fr)` }}>
        {children}
      </div>
    </div>
  );
}

function CompareRow({ label, values, numeric = false, highest = false, big = false }) {
  let max = null, min = null, hasDiff = false;
  if (numeric && highest) {
    const nums = values.map(v => typeof v === "object" ? 0 : Number(v) || 0);
    max = Math.max(...nums);
    min = Math.min(...nums);
    hasDiff = max !== min;
  }
  return (
    <div style={compareRowStyle}>
      <div style={compareLabelCell}>{label}</div>
      {values.map((v, i) => {
        let color = "#fff", weight = 600;
        if (numeric && highest && hasDiff) {
          const n = Number(v) || 0;
          if (n === max && max > 0) { color = "#22c55e"; weight = 800; }
          else if (n === min) { color = "#C46868"; }
        }
        if (typeof v === "object" && v !== null && v.color) {
          return (
            <div key={i} style={{ ...compareValueCell }}>
              <span style={{ background: v.color, padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>{v.text}</span>
            </div>
          );
        }
        return (
          <div key={i} style={{ ...compareValueCell, color, fontWeight: weight, fontSize: big ? 22 : 14 }}>
            {v || "—"}
          </div>
        );
      })}
    </div>
  );
}
