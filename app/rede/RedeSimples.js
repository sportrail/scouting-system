"use client";

import { useState, useEffect } from "react";

const KEY = "sportrail_rede_simples_v1";

const S = {
  bg: "#0B0D1A", panel: "#161929", border: "#2A2E48",
  red: "#DDB85C", text: "#E8EAF2", muted: "#5E6383",
};

const inp = {
  background: "#1F2338", border: `1px solid #2A2E48`, borderRadius: 8,
  color: "#E8EAF2", fontSize: 14, padding: "10px 13px", width: "100%",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const CARGOS = [
  "Diretor de Scouting", "Coordenador Regional", "Scout Sénior",
  "Scout", "Analista de Vídeo", "Observador",
];

const emptyMembro = (n) => ({ id: n, nome: "", cargo: "Scout", competencias: "" });
const emptyArea   = (n) => ({ id: n, nome: "", clubes: "", competicoes: "" });

const defaultRede = () => ({
  aluno: "", turma: "",
  clube: "", epoca: "", objetivo: "",
  membros: [1, 2, 3].map(emptyMembro),
  areas:   [1, 2, 3].map(emptyArea),
  notas: "",
});

const load = () => {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch(e) {}
  return defaultRede();
};

// ── PDF generation ───────────────────────────────────────────────────────────

const loadScript = (src) => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) return res();
  const s = document.createElement("script");
  s.src = src; s.onload = res; s.onerror = rej;
  document.head.appendChild(s);
});

const wrap = (doc, text, x, maxW, lineH, y) => {
  const lines = doc.splitTextToSize(String(text || "—"), maxW);
  lines.forEach(line => {
    if (y > 272) { doc.addPage(); doc.setFillColor(11, 13, 26); doc.rect(0, 0, 210, 297, "F"); y = 16; }
    doc.text(line, x, y);
    y += lineH;
  });
  return y;
};

async function gerarPDF(rede) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const BG   = [11, 13, 26];
  const RED  = [221, 184, 92];
  const TEXT = [245, 245, 245];
  const MUTED= [136, 136, 136];
  const PANEL= [19, 18, 26];
  const BORD = [42, 42, 47];
  const W = 210, M = 14, contentW = W - M * 2;

  // Background
  const paintBg = () => { doc.setFillColor(...BG); doc.rect(0, 0, W, 297, "F"); };
  paintBg();

  let y = 0;

  // ── Header bar ──
  doc.setFillColor(...RED);
  doc.rect(0, 0, W, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("SPORTRAIL  ·  REDE DE SCOUTING", M, 12);
  const hoje = new Date().toLocaleDateString("pt-PT");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(hoje, W - M, 12, { align: "right" });
  y = 26;

  // ── Student info ──
  if (rede.aluno) {
    doc.setFillColor(...PANEL);
    doc.roundedRect(M, y, contentW, 14, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("ALUNO", M + 4, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TEXT);
    doc.text(rede.aluno + (rede.turma ? `  ·  ${rede.turma}` : ""), M + 4, y + 11);
    y += 20;
  }

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEXT);
  doc.text(rede.clube || "Clube", M, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text((rede.epoca || "") + (rede.epoca ? "" : ""), M, y + 14);
  y += 22;

  // ── Divider ──
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 8;

  // helper: section header
  const sectionHead = (title) => {
    if (y > 268) { doc.addPage(); paintBg(); y = 14; }
    doc.setFillColor(...RED);
    doc.roundedRect(M, y, contentW, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), M + 4, y + 5);
    y += 11;
  };

  // helper: label + value
  const field = (label, value) => {
    if (y > 274) { doc.addPage(); paintBg(); y = 14; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), M, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    y = wrap(doc, value || "—", M, contentW, 5, y);
    y += 4;
  };

  // ── 1. Objetivo ──
  sectionHead("1 · Clube e Objetivo");
  field("Objetivo da rede de scouting", rede.objetivo);
  y += 2;

  // ── 2. Departamento ──
  sectionHead("2 · Departamento de Scouting");
  const membros = (rede.membros || []).filter(m => m.nome || m.competencias);
  if (membros.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text("Sem elementos definidos.", M, y); y += 8;
  } else {
    membros.forEach((m, i) => {
      if (y > 260) { doc.addPage(); paintBg(); y = 14; }
      doc.setFillColor(...PANEL);
      doc.roundedRect(M, y, contentW, 12, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...RED);
      doc.text(m.nome || `Elemento ${i+1}`, M + 4, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(m.cargo, M + 4, y + 10);
      y += 16;
      if (m.competencias) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...TEXT);
        y = wrap(doc, m.competencias, M + 4, contentW - 8, 4.5, y);
      }
      y += 5;
    });
  }

  // ── 3. Áreas ──
  sectionHead("3 · Áreas Geográficas");
  const areas = (rede.areas || []).filter(a => a.nome || a.clubes);
  if (areas.length === 0) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text("Sem áreas definidas.", M, y); y += 8;
  } else {
    areas.forEach((a, i) => {
      if (y > 255) { doc.addPage(); paintBg(); y = 14; }
      doc.setFillColor(...PANEL);
      doc.roundedRect(M, y, contentW, 8, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text(a.nome || `Área ${i+1}`, M + 4, y + 6);
      y += 12;
      if (a.clubes) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
        doc.text("CLUBES", M + 4, y); y += 4;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TEXT);
        y = wrap(doc, a.clubes, M + 4, contentW - 8, 4.5, y);
        y += 1;
      }
      if (a.competicoes) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
        doc.text("COMPETIÇÕES", M + 4, y); y += 4;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TEXT);
        y = wrap(doc, a.competicoes, M + 4, contentW - 8, 4.5, y);
        y += 1;
      }
      y += 4;
    });
  }

  // ── 4. Notas ──
  if (rede.notas) {
    sectionHead("4 · Notas e Justificação");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT);
    y = wrap(doc, rede.notas, M, contentW, 5, y);
  }

  // ── Footer on each page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("scouting.sportrail.pt", M, 293);
    doc.text(`${p} / ${totalPages}`, W - M, 293, { align: "right" });
  }

  const filename = `rede-scouting-${(rede.aluno || rede.clube || "trabalho").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Label({ children }) {
  return <div style={{ fontSize: 11, color: S.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>{children}</div>;
}

function Section({ title, children }) {
  return (
    <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: S.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, marginBottom: 18, paddingBottom: 12, borderBottom: `1px solid ${S.border}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RedeSimples() {
  const [rede, setRede] = useState(load);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(rede)); } catch(e) {}
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [rede]);

  const set = (field, val) => setRede(r => ({ ...r, [field]: val }));

  const setMembro = (id, field, val) =>
    setRede(r => ({ ...r, membros: r.membros.map(m => m.id === id ? { ...m, [field]: val } : m) }));

  const setArea = (id, field, val) =>
    setRede(r => ({ ...r, areas: r.areas.map(a => a.id === id ? { ...a, [field]: val } : a) }));

  const addMembro = () => setRede(r => ({ ...r, membros: [...r.membros, emptyMembro(Date.now())] }));
  const delMembro = (id) => setRede(r => ({ ...r, membros: r.membros.filter(m => m.id !== id) }));

  const addArea = () => setRede(r => ({ ...r, areas: [...r.areas, emptyArea(Date.now())] }));
  const delArea = (id) => setRede(r => ({ ...r, areas: r.areas.filter(a => a.id !== id) }));

  const handlePDF = async () => {
    setExporting(true);
    try { await gerarPDF(rede); } catch(e) { alert("Erro ao gerar PDF. Tenta novamente."); }
    setExporting(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: S.panel, borderBottom: `2px solid ${S.red}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ color: S.red, fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>SPORTRAIL</span>
          <span style={{ fontSize: 11, color: S.muted, letterSpacing: 2, fontWeight: 700, marginLeft: 10 }}>REDE DE SCOUTING</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 11, color: "#22c55e" }}>✓ guardado</span>}
          <a href="/" style={{ fontSize: 11, color: S.muted, textDecoration: "none", padding: "6px 12px", border: `1px solid ${S.border}`, borderRadius: 6 }}>← Relatórios</a>
          <button onClick={handlePDF} disabled={exporting}
            style={{ background: S.red, color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: exporting ? "wait" : "pointer", fontFamily: "inherit", opacity: exporting ? 0.7 : 1 }}>
            {exporting ? "A gerar..." : "Exportar PDF"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "30px 20px 80px" }}>

        {/* 0 — Identificação do aluno */}
        <Section title="Identificação">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px" }}>
              <Label>Nome do aluno</Label>
              <input style={inp} value={rede.aluno} onChange={e => set("aluno", e.target.value)} placeholder="O teu nome completo" />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <Label>Turma / Curso</Label>
              <input style={inp} value={rede.turma} onChange={e => set("turma", e.target.value)} placeholder="ex: Turma A" />
            </div>
          </div>
        </Section>

        {/* 1 — Clube */}
        <Section title="1 · O Clube">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <Label>Nome do clube</Label>
              <input style={inp} value={rede.clube} onChange={e => set("clube", e.target.value)} placeholder="ex: Sporting CP" />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <Label>Época</Label>
              <input style={inp} value={rede.epoca} onChange={e => set("epoca", e.target.value)} placeholder="ex: 2024/25" />
            </div>
          </div>
          <Label>Objetivo da rede de scouting para este clube</Label>
          <textarea style={{ ...inp, resize: "vertical" }} rows={3} value={rede.objetivo}
            onChange={e => set("objetivo", e.target.value)}
            placeholder="Que tipo de jogadores querem encontrar? Em que mercados? Para que escalão?" />
        </Section>

        {/* 2 — Departamento */}
        <Section title="2 · Departamento de Scouting">
          <p style={{ fontSize: 13, color: S.muted, marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
            Lista os elementos do departamento, o cargo de cada um e as suas principais competências ou responsabilidades.
          </p>
          {rede.membros.map((m, i) => (
            <div key={m.id} style={{ background: "#0B0D1A", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: S.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Elemento {i + 1}</span>
                {rede.membros.length > 1 && (
                  <button onClick={() => delMembro(m.id)} style={{ background: "transparent", border: "none", color: "#C46868", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                    Remover
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <Label>Nome</Label>
                  <input style={inp} value={m.nome} onChange={e => setMembro(m.id, "nome", e.target.value)} placeholder="Nome" />
                </div>
                <div style={{ flex: "1 1 180px" }}>
                  <Label>Cargo</Label>
                  <select style={{ ...inp, cursor: "pointer" }} value={m.cargo} onChange={e => setMembro(m.id, "cargo", e.target.value)}>
                    {CARGOS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 100%" }}>
                  <Label>Competências e responsabilidades</Label>
                  <input style={inp} value={m.competencias} onChange={e => setMembro(m.id, "competencias", e.target.value)}
                    placeholder="ex: análise de vídeo, scouting ao vivo no Norte de Portugal, relatórios técnicos" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addMembro} style={{ background: "transparent", border: `1px dashed ${S.border}`, borderRadius: 8, padding: "10px 0", width: "100%", color: S.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            + Adicionar elemento
          </button>
        </Section>

        {/* 3 — Áreas geográficas */}
        <Section title="3 · Áreas Geográficas">
          <p style={{ fontSize: 13, color: S.muted, marginTop: 0, marginBottom: 18, lineHeight: 1.6 }}>
            Define as zonas geográficas que a rede vai cobrir, com os clubes e competições relevantes em cada área.
          </p>
          {rede.areas.map((a, i) => (
            <div key={a.id} style={{ background: "#0B0D1A", border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: S.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Área {i + 1}</span>
                {rede.areas.length > 1 && (
                  <button onClick={() => delArea(a.id)} style={{ background: "transparent", border: "none", color: "#C46868", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                    Remover
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 100%" }}>
                  <Label>Área geográfica</Label>
                  <input style={inp} value={a.nome} onChange={e => setArea(a.id, "nome", e.target.value)} placeholder="ex: Norte de Portugal, Galiza, Brasil" />
                </div>
                <div style={{ flex: "1 1 calc(50% - 6px)" }}>
                  <Label>Clubes a monitorizar</Label>
                  <input style={inp} value={a.clubes} onChange={e => setArea(a.id, "clubes", e.target.value)} placeholder="ex: FC Porto B, Boavista, Leixões" />
                </div>
                <div style={{ flex: "1 1 calc(50% - 6px)" }}>
                  <Label>Competições cobertas</Label>
                  <input style={inp} value={a.competicoes} onChange={e => setArea(a.id, "competicoes", e.target.value)} placeholder="ex: Liga 2, Série A AF Porto" />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addArea} style={{ background: "transparent", border: `1px dashed ${S.border}`, borderRadius: 8, padding: "10px 0", width: "100%", color: S.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            + Adicionar área
          </button>
        </Section>

        {/* 4 — Notas */}
        <Section title="4 · Notas e Justificação">
          <Label>Explica as principais opções feitas na construção desta rede</Label>
          <textarea style={{ ...inp, resize: "vertical" }} rows={5} value={rede.notas}
            onChange={e => set("notas", e.target.value)}
            placeholder="Porque escolheste estas áreas? Que lógica seguiste na divisão de responsabilidades? Que desafios antecipas?" />
        </Section>

      </div>
    </div>
  );
}
