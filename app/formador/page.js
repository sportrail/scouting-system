"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "../../lib/supabase/client";

// Painel do Formador — lista relatórios dos formandos, detalhe + PDF + feedback por email.

const S = {
  bg: "#0B0D1A",
  panel: "#161929",
  border: "#2A2E48",
  red: "#DDB85C",
  text: "#E8EAF2",
  muted: "#5E6383",
  dim: "#5E6383",
  green: "#22c55e",
  yellow: "#eab308",
};

const DECISIONS = {
  contratar:      { label: "CONTRATAR",     color: S.green },
  observar:       { label: "OBSERVAR",      color: S.yellow },
  sem_interesse:  { label: "SEM INTERESSE", color: "#C46868" },
  "CONTRATAR JÁ": { label: "CONTRATAR JÁ", color: S.green },
  "CONTRATAR":    { label: "CONTRATAR",     color: S.green },
  "MONITORIZAR":  { label: "MONITORIZAR",   color: S.yellow },
  "REJEITAR":     { label: "REJEITAR",      color: "#C46868" },
};

function loadLib(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

// ── Simplified formador PDF ───────────────────────────────────────────────
function generateFormadorPDF(jsPDF, row, feedback) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PAGE_W = 210;
  const M = 14;
  const contentW = PAGE_W - 2 * M;

  const RED = [221, 184, 92];
  const BG  = [11, 13, 26];
  const PNL = [19, 18, 26];
  const BDR = [42, 42, 47];
  const TXT = [245, 245, 245];
  const MUT = [136, 136, 136];
  const DIM = [85, 85, 85];
  const GRN = [34, 197, 94];
  const YLW = [234, 179, 8];

  doc.setFillColor(...BG);
  doc.rect(0, 0, PAGE_W, 297, "F");

  let y = M;

  // Header bar
  doc.setFillColor(...RED);
  doc.rect(M, y, contentW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SPORTRAIL", M + 3, y + 7);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("AVALIAÇÃO DO FORMADOR", PAGE_W - M - 3, y + 7, { align: "right" });
  y += 14;

  const d = row.data || {};

  // Section helper
  const section = (title) => {
    if (y > 265) { doc.addPage(); doc.setFillColor(...BG); doc.rect(0, 0, PAGE_W, 297, "F"); y = M; }
    doc.setFillColor(...RED);
    doc.rect(M, y, 1.5, 5, "F");
    doc.setTextColor(...TXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), M + 3, y + 4);
    y += 7;
  };

  const textBox = (label, value, x, w) => {
    doc.setFontSize(6);
    doc.setTextColor(...DIM);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x, y);
    doc.setFillColor(...PNL);
    doc.setDrawColor(...BDR);
    doc.setLineWidth(0.15);
    doc.rect(x, y + 1, w, 5.5, "FD");
    doc.setFontSize(9);
    doc.setTextColor(...TXT);
    const txt = doc.splitTextToSize(String(value || "—"), w - 2)[0];
    doc.text(txt || "—", x + 1.5, y + 5.2);
  };

  // ── Player block ──
  section("Jogador");
  y += 1;
  const col3 = (contentW - 4) / 3;
  textBox("Nome", d.nome, M, contentW);
  y += 9;
  textBox("Clube", d.clube, M, col3);
  textBox("Posição", d.pos, M + col3 + 2, col3);
  textBox("Pé dominante", d.pe, M + 2 * (col3 + 2), col3);
  y += 9;
  textBox("Data de nascimento", d.dataNasc, M, col3);
  textBox("Nacionalidade", d.nacionalidade, M + col3 + 2, col3);
  textBox("Contrato até", d.contratoAte, M + 2 * (col3 + 2), col3);
  y += 12;

  // ── Nota + decisão ──
  section("Avaliação do scout");
  y += 1;
  // Nota box
  doc.setFillColor(...PNL);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, 28, 20, 2, 2, "FD");
  doc.setFontSize(6);
  doc.setTextColor(...MUT);
  doc.setFont("helvetica", "normal");
  doc.text("NOTA", M + 14, y + 4, { align: "center" });
  doc.setFontSize(22);
  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.text(String(d.nota || "—"), M + 14, y + 14, { align: "center" });

  // Decision + P/R
  const dec = DECISIONS[d.decisao];
  if (dec) {
    doc.setFillColor(...(dec.color === S.green ? GRN : dec.color === S.yellow ? YLW : [196, 104, 104]));
    doc.roundedRect(M + 32, y + 1, 44, 7, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(dec.label, M + 32 + 22, y + 5.5, { align: "center" });
  }
  if (d.potencial) {
    doc.setFillColor(...RED);
    doc.roundedRect(M + 80, y + 1, 30, 7, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`P: ${d.potencial}`, M + 80 + 15, y + 5.5, { align: "center" });
  }
  if (d.rendimento) {
    doc.setFillColor(...YLW);
    doc.roundedRect(M + 114, y + 1, 30, 7, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`R: ${d.rendimento}`, M + 114 + 15, y + 5.5, { align: "center" });
  }
  y += 25;

  // ── Scores ──
  const cats = d.cats;
  const dims = d.dim;
  const mode = d.mode || "senior";

  if (cats && mode === "senior") {
    section("Parâmetros técnicos e físicos");
    y += 1;
    const colW = (contentW - 2) / 2;
    Object.entries(cats).forEach(([catKey, catScores]) => {
      // Group by category prefix (e.g. "tecnicos_0" → "tecnicos")
    });
    // Render cats scores as a flat list grouped by prefix
    const catGroups = {};
    Object.entries(cats || {}).forEach(([k, v]) => {
      const parts = k.split("_");
      const cat = parts.slice(0, -1).join("_");
      if (!catGroups[cat]) catGroups[cat] = [];
      catGroups[cat].push({ idx: parseInt(parts[parts.length - 1]), val: v });
    });
    Object.entries(catGroups).forEach(([cat, items]) => {
      items.sort((a, b) => a.idx - b.idx);
      const catLabel = { tecnicos: "TÉCNICOS", fisicos: "FÍSICOS", tatticos: "TÁCTICOS", mentais: "MENTAIS" }[cat] || cat.toUpperCase();
      doc.setFontSize(7);
      doc.setTextColor(...MUT);
      doc.setFont("helvetica", "bold");
      doc.text(catLabel, M, y + 3);
      y += 5;
      items.forEach((item, i) => {
        const x = i % 2 === 0 ? M : M + colW + 2;
        if (i % 2 === 0 && i > 0) y += 6;
        const score = Number(item.val) || 0;
        doc.setFillColor(...PNL);
        doc.rect(x, y, colW, 5, "F");
        doc.setFontSize(6);
        doc.setTextColor(...MUT);
        doc.setFont("helvetica", "normal");
        doc.text(`Item ${item.idx + 1}`, x + 1.5, y + 3.5);
        // Score bar
        const barX = x + 30;
        const barW = colW - 38;
        doc.setFillColor(...BDR);
        doc.rect(barX, y + 1.5, barW, 2, "F");
        if (score > 0) {
          doc.setFillColor(...RED);
          doc.rect(barX, y + 1.5, barW * (score / 5), 2, "F");
        }
        doc.setFontSize(7);
        doc.setTextColor(...TXT);
        doc.setFont("helvetica", "bold");
        doc.text(String(score), x + colW - 2, y + 3.5, { align: "right" });
      });
      if (items.length % 2 !== 0) y += 6;
      y += 4;
    });
  } else if (dims && Object.keys(dims).length > 0) {
    section("Dimensões");
    y += 1;
    Object.entries(dims).forEach(([dim, val]) => {
      const score = Number(val) || 0;
      doc.setFillColor(...PNL);
      doc.rect(M, y, contentW, 6, "F");
      doc.setFontSize(7);
      doc.setTextColor(...MUT);
      doc.setFont("helvetica", "normal");
      doc.text(dim, M + 2, y + 4);
      const barX = M + 50;
      const barW = contentW - 58;
      doc.setFillColor(...BDR);
      doc.rect(barX, y + 2, barW, 2, "F");
      if (score > 0) {
        doc.setFillColor(...RED);
        doc.rect(barX, y + 2, barW * (score / 10), 2, "F");
      }
      doc.setFontSize(8);
      doc.setTextColor(...TXT);
      doc.setFont("helvetica", "bold");
      doc.text(String(score), M + contentW - 2, y + 4, { align: "right" });
      y += 8;
    });
    y += 2;
  }

  // ── Observações ──
  if (d.obs) {
    section("Observações do scout");
    y += 1;
    doc.setFontSize(8);
    doc.setTextColor(...TXT);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(d.obs, contentW - 2);
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); doc.setFillColor(...BG); doc.rect(0, 0, PAGE_W, 297, "F"); y = M; }
      doc.text(line, M, y);
      y += 5;
    });
    y += 4;
  }

  // ── Parecer ──
  if (d.parecer) {
    section("Parecer do scout");
    y += 1;
    doc.setFontSize(8);
    doc.setTextColor(...TXT);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(d.parecer, contentW - 2);
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); doc.setFillColor(...BG); doc.rect(0, 0, PAGE_W, 297, "F"); y = M; }
      doc.text(line, M, y);
      y += 5;
    });
    y += 4;
  }

  // ── Feedback do formador ──
  if (feedback?.grade != null) {
    if (y > 240) { doc.addPage(); doc.setFillColor(...BG); doc.rect(0, 0, PAGE_W, 297, "F"); y = M; }
    section("Avaliação do formador");
    y += 2;
    doc.setFillColor(...PNL);
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, contentW, feedback.comment ? 30 : 16, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setTextColor(...MUT);
    doc.setFont("helvetica", "normal");
    doc.text("NOTA DO FORMADOR", M + 4, y + 5);
    doc.setFontSize(22);
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "bold");
    doc.text(`${feedback.grade}/20`, M + 4, y + 14);
    if (feedback.comment) {
      doc.setFontSize(7);
      doc.setTextColor(...MUT);
      doc.setFont("helvetica", "normal");
      doc.text("COMENTÁRIO", M + 4, y + 20);
      doc.setFontSize(8);
      doc.setTextColor(...TXT);
      const cLines = doc.splitTextToSize(feedback.comment, contentW - 10);
      doc.text(cLines[0] || "", M + 4, y + 26);
    }
    y += feedback.comment ? 36 : 22;
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...DIM);
  doc.setFont("helvetica", "normal");
  const now = new Date().toLocaleDateString("pt-PT");
  doc.text(`Gerado em ${now} · scouting.sportrail.pt`, PAGE_W / 2, 290, { align: "center" });

  const nome = (d.nome || "relatorio").replace(/\s+/g, "_").toLowerCase();
  doc.save(`sportrail_formador_${nome}.pdf`);
}

// ── Main component ────────────────────────────────────────────────────────
export default function FormadorPage() {
  const [user, setUser]             = useState(null);
  const [courses, setCourses]       = useState([]);
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [activeCourse, setActiveCourse] = useState("all");
  const [search, setSearch]         = useState("");
  const [detailRow, setDetailRow]   = useState(null);
  const [feedbackMap, setFeedbackMap] = useState({});  // report_id → {grade, comment, sent_at}
  const [grade, setGrade]           = useState("");
  const [fbComment, setFbComment]   = useState("");
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState(null); // null | "ok" | "error"
  const [sendMsg, setSendMsg]       = useState("");

  useEffect(() => {
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) { window.location.href = "/login"; return; }
        setUser(u);

        const { data: ctRows, error: cErr } = await supabase
          .from("course_trainers")
          .select("course_code")
          .eq("trainer_id", u.id);

        if (cErr) throw cErr;
        if (!ctRows?.length) {
          setError("Não tens nenhum curso atribuído como formador. Pede ao administrador para te adicionar à tabela course_trainers.");
          setLoading(false);
          return;
        }

        const codes = ctRows.map(r => r.course_code);
        const { data: courseDetails } = await supabase
          .from("courses")
          .select("code, name")
          .in("code", codes);
        const trainerCourses = courseDetails || codes.map(c => ({ code: c, name: c }));
        setCourses(trainerCourses);
        const { data: reps, error: rErr } = await supabase
          .from("reports")
          .select("id, owner_id, course_code, student_name, student_email, data, updated_at")
          .in("course_code", codes)
          .order("updated_at", { ascending: false });

        if (rErr) throw rErr;
        const repList = reps || [];
        setReports(repList);

        // Fetch any existing feedback for these reports
        if (repList.length) {
          const ids = repList.map(r => r.id);
          const { data: fbData } = await supabase
            .from("report_feedback")
            .select("report_id, grade, comment, sent_at")
            .eq("formador_id", u.id)
            .in("report_id", ids);
          if (fbData) {
            const map = {};
            fbData.forEach(fb => { map[fb.report_id] = fb; });
            setFeedbackMap(map);
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dados: " + (err?.message || err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openDetail = useCallback((row) => {
    setDetailRow(row);
    const existing = feedbackMap[row.id];
    setGrade(existing?.grade != null ? String(existing.grade) : "");
    setFbComment(existing?.comment || "");
    setSendResult(null);
    setSendMsg("");
  }, [feedbackMap]);

  const closeDetail = () => { setDetailRow(null); setSendResult(null); };

  const handlePDF = () => {
    const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFLib) { alert("A carregar biblioteca PDF, tenta de novo em 2 segundos."); return; }
    const existing = feedbackMap[detailRow.id];
    generateFormadorPDF(jsPDFLib, detailRow, existing || null);
  };

  const handleSendFeedback = async () => {
    if (grade === "" || isNaN(Number(grade))) {
      setSendResult("error"); setSendMsg("Introduz uma nota válida (0–20)."); return;
    }
    const g = Number(grade);
    if (g < 0 || g > 20) {
      setSendResult("error"); setSendMsg("A nota deve estar entre 0 e 20."); return;
    }
    setSending(true); setSendResult(null); setSendMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: detailRow.id,
          owner_id: detailRow.owner_id,
          course_code: detailRow.course_code,
          grade: g,
          comment: fbComment.trim(),
          player_name: detailRow.data?.nome || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSendResult("error"); setSendMsg(json.error || "Erro desconhecido."); return; }

      const newFb = { grade: g, comment: fbComment.trim(), sent_at: new Date().toISOString() };
      setFeedbackMap(m => ({ ...m, [detailRow.id]: newFb }));
      setSendResult("ok");
      setSendMsg(json.emailWarning || "Feedback enviado com sucesso!");
    } catch (err) {
      setSendResult("error"); setSendMsg("Erro de rede. Tenta de novo.");
    } finally {
      setSending(false);
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const filtered = reports.filter(row => {
    if (activeCourse !== "all" && row.course_code !== activeCourse) return false;
    if (search) {
      const q = search.toLowerCase();
      const d = row.data || {};
      return (d.nome || "").toLowerCase().includes(q) || (d.clube || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* HEADER */}
      <header style={{ borderBottom: `1px solid ${S.border}`, padding: "14px 24px", background: "rgba(11,13,26,0.97)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: S.red, fontSize: 24, fontWeight: 900, letterSpacing: 2 }}>S³</div>
          <div style={{ fontSize: 12, color: S.muted, letterSpacing: 1, fontWeight: 700 }}>PAINEL DO FORMADOR</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/" style={{ fontSize: 12, color: S.muted, textDecoration: "none", padding: "6px 12px", border: `1px solid ${S.border}`, borderRadius: 6 }}>← Scouting</a>
          <button onClick={signOut} style={{ fontSize: 12, color: S.muted, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        {loading && <div style={{ textAlign: "center", color: S.muted, marginTop: 60 }}>A carregar…</div>}

        {error && (
          <div style={{ marginTop: 40, padding: "16px 20px", background: "rgba(221,184,92,0.08)", border: `1px solid ${S.red}`, borderRadius: 10, color: "#C46868", fontSize: 13, lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { label: "Cursos", value: courses.length, color: S.red },
                { label: "Relatórios", value: reports.length, color: "#fff" },
                { label: "Avaliados", value: Object.keys(feedbackMap).length, color: S.green },
                { label: "Por avaliar", value: reports.length - Object.keys(feedbackMap).length, color: S.yellow },
              ].map(s => (
                <div key={s.label} style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 10, padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* FILTERS */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar nome ou clube…"
                style={{ flex: 1, minWidth: 200, background: S.bg, border: `1px solid ${S.border}`, color: S.text, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[{ code: "all", name: "Todos" }, ...courses].map(c => (
                  <button key={c.code} onClick={() => setActiveCourse(c.code)}
                    style={{ padding: "7px 12px", borderRadius: 6, border: `1px solid ${activeCourse === c.code ? S.red : S.border}`, background: activeCourse === c.code ? "rgba(221,184,92,0.15)" : "transparent", color: activeCourse === c.code ? S.red : S.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {c.code === "all" ? "Todos" : c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLE */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: S.muted, marginTop: 60 }}>
                {reports.length === 0 ? "Ainda não há relatórios submetidos." : "Nenhum resultado para esta pesquisa."}
              </div>
            ) : (
              <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                      {["Formando", "Jogador", "Clube", "Pos.", "Nota", "Decisão", "Curso", "Feedback", "Atualizado", ""].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const d = row.data || {};
                      const dec = DECISIONS[d.decisao];
                      const fb = feedbackMap[row.id];
                      const updated = row.updated_at ? new Date(row.updated_at).toLocaleDateString("pt-PT") : "—";
                      return (
                        <tr key={row.id}
                          onClick={() => openDetail(row)}
                          style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${S.border}` : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(221,184,92,0.06)"}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"}
                        >
                          <td style={{ padding: "10px 14px", fontSize: 11, color: S.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.student_email || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: S.text, whiteSpace: "nowrap" }}>{d.nome || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 11, color: S.muted, whiteSpace: "nowrap" }}>{row.student_name || row.student_email || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: S.muted }}>{d.clube || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: S.muted }}>{d.pos || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 900, color: S.red }}>{d.nota || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {dec ? <span style={{ fontSize: 11, fontWeight: 700, color: dec.color }}>{dec.label}</span> : <span style={{ color: S.dim }}>—</span>}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 11, color: S.red, fontWeight: 700 }}>{row.course_code || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {fb?.grade != null
                              ? <span style={{ fontSize: 12, fontWeight: 900, color: S.green }}>{fb.grade}/20</span>
                              : <span style={{ fontSize: 11, color: S.dim }}>—</span>
                            }
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 11, color: S.muted, whiteSpace: "nowrap" }}>{updated}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: 11, color: S.red, fontWeight: 600 }}>Ver →</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* DETAIL PANEL */}
      {detailRow && (
        <>
          {/* Overlay */}
          <div onClick={closeDetail} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 20, backdropFilter: "blur(2px)" }} />

          {/* Drawer */}
          <div style={{ position: "fixed", top: 0, right: 0, width: "min(540px, 100vw)", height: "100vh", background: S.panel, borderLeft: `1px solid ${S.border}`, zIndex: 30, display: "flex", flexDirection: "column", boxShadow: "-10px 0 40px rgba(0,0,0,0.6)" }}>

            {/* Drawer header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{detailRow.data?.nome || "Relatório"}</div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{detailRow.data?.clube || "—"} · {detailRow.data?.pos || "—"}</div>
                {(detailRow.student_name || detailRow.student_email) && (
                  <div style={{ fontSize: 11, color: S.red, marginTop: 3, fontWeight: 600 }}>
                    {detailRow.student_name || detailRow.student_email}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handlePDF} style={{ padding: "7px 14px", background: S.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>PDF</button>
                <button onClick={closeDetail} style={{ padding: "7px 12px", background: "transparent", color: S.muted, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 18, lineHeight: 1, cursor: "pointer" }}>×</button>
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              <DetailContent row={detailRow} feedback={feedbackMap[detailRow.id]} />

              {/* ── FEEDBACK SECTION ── */}
              <div style={{ marginTop: 28, padding: 18, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: S.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                  Avaliação do formador
                  {feedbackMap[detailRow.id]?.sent_at && (
                    <span style={{ marginLeft: 10, color: S.green, textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
                      ✓ enviado {new Date(feedbackMap[detailRow.id].sent_at).toLocaleDateString("pt-PT")}
                    </span>
                  )}
                </div>

                <label style={{ fontSize: 11, color: S.muted, display: "block", marginBottom: 6 }}>Nota (0–20)</label>
                <input
                  type="number" min="0" max="20" step="1"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  placeholder="ex: 15"
                  style={{ width: "100%", background: "#1F2338", border: `1px solid ${S.border}`, color: S.text, padding: "10px 12px", borderRadius: 6, fontSize: 22, fontWeight: 900, fontFamily: "inherit", outline: "none", marginBottom: 14, boxSizing: "border-box" }}
                />

                <label style={{ fontSize: 11, color: S.muted, display: "block", marginBottom: 6 }}>Comentário (opcional)</label>
                <textarea
                  value={fbComment}
                  onChange={e => setFbComment(e.target.value)}
                  placeholder="Escreve um comentário que será enviado ao aluno por email…"
                  rows={4}
                  style={{ width: "100%", background: "#1F2338", border: `1px solid ${S.border}`, color: S.text, padding: "10px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 14 }}
                />

                {sendResult === "ok" && (
                  <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(34,197,94,0.1)", border: `1px solid ${S.green}`, borderRadius: 8, color: S.green, fontSize: 13 }}>
                    ✓ {sendMsg}
                  </div>
                )}
                {sendResult === "error" && (
                  <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(221,184,92,0.1)", border: `1px solid ${S.red}`, borderRadius: 8, color: "#C46868", fontSize: 13 }}>
                    ⚠ {sendMsg}
                  </div>
                )}

                <button
                  onClick={handleSendFeedback}
                  disabled={sending}
                  style={{ width: "100%", padding: "12px", background: sending ? "#2A2E48" : S.red, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending ? "wait" : "pointer", fontFamily: "inherit" }}
                >
                  {sending ? "A enviar…" : feedbackMap[detailRow.id]?.grade != null ? "Atualizar e reenviar feedback" : "Enviar feedback ao aluno"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Detail content component ──────────────────────────────────────────────
function DetailContent({ row, feedback }) {
  const d = row.data || {};
  const dec = DECISIONS[d.decisao];

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 10, color: S.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, marginTop: 20, borderBottom: `1px solid ${S.border}`, paddingBottom: 6 }}>
      {children}
    </div>
  );

  const Block = ({ label, value }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: S.text, background: "#0B0D1A", border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 10px" }}>{value || "—"}</div>
    </div>
  );

  const TextBlock = ({ label, value }) => value ? (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: "#5E6383", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: S.text, background: "#0B0D1A", border: `1px solid ${S.border}`, borderRadius: 6, padding: "10px 12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  ) : null;

  return (
    <div>
      {/* ── Avaliação global ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 4, alignItems: "stretch" }}>
        <div style={{ background: "#0B0D1A", border: `2px solid ${S.red}`, borderRadius: 10, padding: "12px 20px", textAlign: "center", minWidth: 70 }}>
          <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase", letterSpacing: 1 }}>Nota</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: S.red, lineHeight: 1.1 }}>{d.nota || "—"}</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {dec && (
            <div style={{ padding: "8px 14px", background: "rgba(0,0,0,0.3)", border: `1px solid ${dec.color}`, borderRadius: 8, fontSize: 13, fontWeight: 700, color: dec.color }}>{dec.label}</div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {d.potencial && <span style={{ padding: "5px 10px", background: "rgba(221,184,92,0.15)", border: `1px solid ${S.red}`, borderRadius: 6, fontSize: 11, fontWeight: 700, color: S.red }}>P: {d.potencial}</span>}
            {d.rendimento && <span style={{ padding: "5px 10px", background: "rgba(234,179,8,0.15)", border: `1px solid ${S.yellow}`, borderRadius: 6, fontSize: 11, fontWeight: 700, color: S.yellow }}>R: {d.rendimento}</span>}
          </div>
          <div style={{ fontSize: 11, color: S.muted }}>Scout: <strong style={{ color: S.text }}>{d.scout || "—"}</strong> · {d.dataRel || "—"}</div>
        </div>
      </div>

      {/* ── Identificação do jogador ── */}
      <SectionTitle>Identificação</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <Block label="Data de nascimento" value={d.dataNasc} />
        <Block label="Naturalidade" value={d.naturalidade} />
        <Block label="Nacionalidade" value={d.nacionalidade} />
        <Block label="Pé dominante" value={d.pe} />
        <Block label="Altura (cm)" value={d.altura} />
        <Block label="Peso (kg)" value={d.peso} />
      </div>

      {/* ── Contexto contratual ── */}
      <SectionTitle>Clube & Contrato</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <Block label="Clube atual" value={d.clube} />
        <Block label="Contrato até" value={d.contratoAte} />
        <Block label="Posição principal" value={d.pos} />
        <Block label="Posição secundária" value={d.posSec} />
        <Block label="Agente" value={d.agente} />
        <Block label="Percurso" value={d.percurso} />
      </div>

      {/* ── Época ── */}
      {(d.jogos || d.golos || d.assists) && (
        <>
          <SectionTitle>Época atual</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
            <Block label="Jogos" value={d.jogos} />
            <Block label="Golos" value={d.golos} />
            <Block label="Assistências" value={d.assists} />
          </div>
        </>
      )}

      {/* ── Parâmetros / scores ── */}
      {d.cats && Object.keys(d.cats).length > 0 && (
        <>
          <SectionTitle>Parâmetros (sénior)</SectionTitle>
          <ScoreGrid cats={d.cats} />
        </>
      )}
      {d.dim && Object.keys(d.dim).length > 0 && (
        <>
          <SectionTitle>Dimensões</SectionTitle>
          {Object.entries(d.dim).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: S.muted, minWidth: 130 }}>{k}</div>
              <div style={{ flex: 1, height: 4, background: "#2A2E48", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(Number(v) / 10) * 100}%`, background: S.red, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: S.text, minWidth: 24, textAlign: "right" }}>{v || 0}</div>
            </div>
          ))}
        </>
      )}
      {d.atr && Object.keys(d.atr).length > 0 && (
        <>
          <SectionTitle>Atributos (formação)</SectionTitle>
          {Object.entries(d.atr).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: S.muted, minWidth: 130 }}>{k}</div>
              <div style={{ flex: 1, height: 4, background: "#2A2E48", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(Number(v) / 10) * 100}%`, background: S.red, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: S.text, minWidth: 24, textAlign: "right" }}>{v || 0}</div>
            </div>
          ))}
        </>
      )}

      {/* ── Texto livre ── */}
      {(d.obs || d.parecer) && <SectionTitle>Relatório escrito</SectionTitle>}
      <TextBlock label="Observações" value={d.obs} />
      <TextBlock label="Parecer do scout" value={d.parecer} />

      {/* ── Feedback já enviado ── */}
      {feedback?.grade != null && (
        <div style={{ marginTop: 16, marginBottom: 14, padding: "12px 16px", background: "rgba(34,197,94,0.08)", border: `1px solid ${S.green}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: S.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Feedback já enviado</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: S.green }}>{feedback.grade}/20</div>
          {feedback.comment && <div style={{ fontSize: 13, color: S.muted, marginTop: 6, lineHeight: 1.5 }}>{feedback.comment}</div>}
        </div>
      )}
    </div>
  );
}

function ScoreGrid({ cats }) {
  const groups = {};
  Object.entries(cats).forEach(([k, v]) => {
    const parts = k.split("_");
    const cat = parts.slice(0, -1).join("_");
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ idx: parseInt(parts[parts.length - 1]), val: Number(v) || 0 });
  });
  Object.values(groups).forEach(arr => arr.sort((a, b) => a.idx - b.idx));

  const catLabels = { tecnicos: "Técnicos", fisicos: "Físicos", tatticos: "Tácticos", mentais: "Mentais" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} style={{ background: "#0B0D1A", border: `1px solid ${S.border}`, borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 10, color: S.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            {catLabels[cat] || cat}
          </div>
          {items.map(item => (
            <div key={item.idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ flex: 1, height: 3, background: "#2A2E48", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(item.val / 5) * 100}%`, background: S.red, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.text, minWidth: 16, textAlign: "right" }}>{item.val}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
