"use client";

import { useState, useEffect } from "react";

const KEY = "sportrail_rede_v1";

const S = {
  bg: "#0B0D1A", panel: "#161929", border: "#2A2E48",
  red: "#DDB85C", text: "#E8EAF2", muted: "#5E6383",
  green: "#22c55e", yellow: "#eab308", blue: "#3b82f6",
};

const inp = {
  background: "#1F2338", border: `1px solid ${S.border}`, borderRadius: 7,
  color: S.text, fontSize: 13, padding: "8px 11px", width: "100%",
  outline: "none", fontFamily: "inherit",
};

const CARGOS = ["Diretor de Scouting", "Coordenador Regional", "Scout Sénior", "Scout", "Analista de Dados", "Observador"];
const PAISES = ["Portugal", "Espanha", "França", "Brasil", "Argentina", "Alemanha", "Itália", "Inglaterra", "Países Baixos", "Bélgica", "Outro"];
const PRIORIDADES = ["Alta", "Média", "Baixa"];
const COMPETENCIAS = [
  "Análise tática", "Scouting ao vivo", "Análise de vídeo", "Base de dados",
  "Relatórios técnicos", "Negociação", "Networking", "Wyscout/InStat",
  "Estatística avançada", "Formação de jovens", "Mercado internacional", "Gestão de equipa",
];
const FERRAMENTAS_LIST = ["Wyscout", "InStat", "Transfermarkt", "SofaScore", "FIFA COMET", "StatsBomb", "Opta", "Base interna", "Excel/Sheets", "Power BI"];
const POSICOES = ["GR", "DC", "LD", "LE", "MD", "MC", "MO", "ED", "EE", "SP", "PL"];
const TABS = ["Clube", "Departamento", "Áreas Geográficas", "Perfil do Jogador", "KPIs & Orçamento"];

const newId = () => crypto.randomUUID();

const emptyMembro = () => ({
  id: newId(), nome: "", cargo: "Scout", nivel: 1,
  competencias: [], areasAssigned: [], observacoesMes: "", notas: "",
});
const emptyArea = () => ({
  id: newId(), nome: "", pais: "Portugal", prioridade: "Média",
  competicoes: "", clubes: "", scoutId: "", frequencia: "",
});
const emptyPerfil = () => ({
  id: newId(), posicoes: [], idadeMin: "", idadeMax: "",
  mercados: [], criterios: "", prioridade: "Alta",
});
const emptyRede = () => ({
  clube: "", epoca: "", escalao: "Sénior", objetivo: "",
  membros: [emptyMembro()],
  areas: [emptyArea()],
  perfis: [emptyPerfil()],
  ferramentas: [],
  metodologia: "",
  orcamento: { total: "", pessoal: "", deslocacoes: "", ferramentas: "", outros: "", notas: "" },
  kpis: { relatoriosMes: "", obsLive: "", obsVideo: "", taxaConversao: "", cobertura: "", notas: "" },
});

const loadRede = () => {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch(e) {}
  return emptyRede();
};

// ── small UI primitives ──────────────────────────────────────────────────────

function Label({ children }) {
  return <div style={{ fontSize: 10, color: S.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 5, fontWeight: 700 }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text", multiline, rows = 3 }) {
  return multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
    : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />;
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...inp, cursor: "pointer", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 28 }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Tag({ label, onRemove, color = S.red }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 5, padding: "2px 8px", fontSize: 11, color, fontWeight: 600 }}>
      {label}
      {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.7, fontSize: 13, lineHeight: 1 }}>×</span>}
    </span>
  );
}

function MultiPick({ options, selected, onChange, color = S.red }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {options.map(o => {
        const active = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onChange(active ? selected.filter(x => x !== o) : [...selected, o])}
            style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${active ? color : S.border}`, background: active ? `${color}22` : "transparent", color: active ? color : S.muted, fontSize: 11, cursor: "pointer", fontWeight: active ? 700 : 400, transition: "all 0.15s" }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Panel({ children, style }) {
  return <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: "18px 20px", ...style }}>{children}</div>;
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, color: S.muted, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${S.border}` }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", small }) {
  const base = { border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s", padding: small ? "6px 12px" : "9px 18px", fontSize: small ? 11 : 13 };
  const styles = {
    primary: { ...base, background: S.red, color: "#fff" },
    ghost:   { ...base, background: "transparent", border: `1px solid ${S.border}`, color: S.muted },
    danger:  { ...base, background: "transparent", border: `1px solid #C4686855`, color: "#C46868" },
  };
  return <button type="button" onClick={onClick} style={styles[variant]}>{children}</button>;
}

function Field({ label, children, half }) {
  return (
    <div style={{ flex: half ? "1 1 calc(50% - 8px)" : "1 1 100%", minWidth: 0 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ── section components ───────────────────────────────────────────────────────

function TabClube({ rede, update }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel>
        <SectionTitle>Identificação</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Field label="Clube" half>
            <Input value={rede.clube} onChange={v => update("clube", v)} placeholder="ex: Sporting CP" />
          </Field>
          <Field label="Época" half>
            <Input value={rede.epoca} onChange={v => update("epoca", v)} placeholder="ex: 2024/25" />
          </Field>
          <Field label="Escalão" half>
            <Select value={rede.escalao} onChange={v => update("escalao", v)} options={["Sénior", "Sub-23", "Sub-19", "Sub-17", "Formação (geral)"]} />
          </Field>
        </div>
      </Panel>
      <Panel>
        <SectionTitle>Missão do Departamento</SectionTitle>
        <Field label="Objetivo estratégico da rede para esta época">
          <Input multiline rows={4} value={rede.objetivo} onChange={v => update("objetivo", v)}
            placeholder="Descreve o objetivo geral da rede de scouting para este clube e época. Ex: identificar e acompanhar jogadores entre 18-23 anos em Portugal e Espanha para reforçar o plantel sénior em 3-4 posições prioritárias..." />
        </Field>
      </Panel>
      <Panel>
        <SectionTitle>Ferramentas e Plataformas</SectionTitle>
        <Label>Seleciona as ferramentas utilizadas pelo departamento</Label>
        <MultiPick options={FERRAMENTAS_LIST} selected={rede.ferramentas} onChange={v => update("ferramentas", v)} color={S.blue} />
      </Panel>
      <Panel>
        <SectionTitle>Metodologia de Trabalho</SectionTitle>
        <Field label="Como funciona o processo de observação e reporte">
          <Input multiline rows={4} value={rede.metodologia} onChange={v => update("metodologia", v)}
            placeholder="Descreve o fluxo de trabalho: como os scouts observam, reportam, e como a informação chega ao staff técnico..." />
        </Field>
      </Panel>
    </div>
  );
}

function TabDepartamento({ rede, update }) {
  const membros = rede.membros || [];
  const updMembro = (id, field, val) => update("membros", membros.map(m => m.id === id ? { ...m, [field]: val } : m));
  const addMembro = () => update("membros", [...membros, emptyMembro()]);
  const delMembro = (id) => update("membros", membros.filter(m => m.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Organigrama visual */}
      {membros.length > 0 && (
        <Panel>
          <SectionTitle>Organigrama</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CARGOS.map(cargo => {
              const group = membros.filter(m => m.cargo === cargo);
              if (group.length === 0) return null;
              return (
                <div key={cargo} style={{ background: "#0B0D1A", border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", minWidth: 140 }}>
                  <div style={{ fontSize: 9, color: S.red, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 800, marginBottom: 6 }}>{cargo}</div>
                  {group.map(m => (
                    <div key={m.id} style={{ fontSize: 12, color: S.text, marginBottom: 2 }}>{m.nome || <span style={{ color: S.muted, fontStyle: "italic" }}>sem nome</span>}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Member cards */}
      {membros.map((m, idx) => (
        <Panel key={m.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: S.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
              Elemento #{idx + 1}
            </div>
            {membros.length > 1 && <Btn variant="danger" small onClick={() => delMembro(m.id)}>Remover</Btn>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Field label="Nome" half>
              <Input value={m.nome} onChange={v => updMembro(m.id, "nome", v)} placeholder="Nome completo" />
            </Field>
            <Field label="Cargo" half>
              <Select value={m.cargo} onChange={v => updMembro(m.id, "cargo", v)} options={CARGOS} />
            </Field>
            <Field label="Observações por mês (previstas)" half>
              <Input type="number" value={m.observacoesMes} onChange={v => updMembro(m.id, "observacoesMes", v)} placeholder="ex: 8" />
            </Field>
            <Field label="Áreas geográficas atribuídas" half>
              <Input value={m.areasAssigned.join(", ")} onChange={v => updMembro(m.id, "areasAssigned", v.split(",").map(s => s.trim()).filter(Boolean))} placeholder="ex: Norte Portugal, Galiza" />
            </Field>
            <Field label="Competências">
              <MultiPick options={COMPETENCIAS} selected={m.competencias} onChange={v => updMembro(m.id, "competencias", v)} />
            </Field>
            <Field label="Notas / justificação da escolha">
              <Input multiline rows={2} value={m.notas} onChange={v => updMembro(m.id, "notas", v)} placeholder="Porque foi incluído este perfil no departamento..." />
            </Field>
          </div>
        </Panel>
      ))}

      <Btn onClick={addMembro}>+ Adicionar elemento ao departamento</Btn>
    </div>
  );
}

function TabAreas({ rede, update }) {
  const areas = rede.areas || [];
  const membros = rede.membros || [];
  const updArea = (id, field, val) => update("areas", areas.map(a => a.id === id ? { ...a, [field]: val } : a));
  const addArea = () => update("areas", [...areas, emptyArea()]);
  const delArea = (id) => update("areas", areas.filter(a => a.id !== id));

  const prioColor = { Alta: S.red, Média: S.yellow, Baixa: S.muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary map */}
      {areas.length > 0 && (
        <Panel>
          <SectionTitle>Resumo da Cobertura</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {areas.map(a => (
              <div key={a.id} style={{ background: "#0B0D1A", border: `1px solid ${prioColor[a.prioridade] || S.border}55`, borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 10, color: prioColor[a.prioridade] || S.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{a.prioridade}</div>
                <div style={{ fontSize: 13, color: S.text, fontWeight: 700 }}>{a.nome || "Sem nome"}</div>
                <div style={{ fontSize: 11, color: S.muted }}>{a.pais}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {areas.map((a, idx) => (
        <Panel key={a.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: S.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
              Área #{idx + 1}
            </div>
            {areas.length > 1 && <Btn variant="danger" small onClick={() => delArea(a.id)}>Remover</Btn>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Field label="Nome da área" half>
              <Input value={a.nome} onChange={v => updArea(a.id, "nome", v)} placeholder="ex: Norte de Portugal" />
            </Field>
            <Field label="País" half>
              <Select value={a.pais} onChange={v => updArea(a.id, "pais", v)} options={PAISES} />
            </Field>
            <Field label="Prioridade" half>
              <Select value={a.prioridade} onChange={v => updArea(a.id, "prioridade", v)} options={PRIORIDADES} />
            </Field>
            <Field label="Frequência de visita" half>
              <Input value={a.frequencia} onChange={v => updArea(a.id, "frequencia", v)} placeholder="ex: 2x por mês" />
            </Field>
            <Field label="Scout responsável">
              <Select value={a.scoutId} onChange={v => updArea(a.id, "scoutId", v)}
                options={["— selecionar —", ...membros.filter(m => m.nome).map(m => m.nome)]} />
            </Field>
            <Field label="Competições cobertas">
              <Input value={a.competicoes} onChange={v => updArea(a.id, "competicoes", v)} placeholder="ex: Liga Portugal 2, Série A Distrital, sub-23 da AF Porto" />
            </Field>
            <Field label="Principais clubes a monitorizar">
              <Input multiline rows={2} value={a.clubes} onChange={v => updArea(a.id, "clubes", v)} placeholder="Lista os clubes desta área com maior interesse para o scouting..." />
            </Field>
          </div>
        </Panel>
      ))}

      <Btn onClick={addArea}>+ Adicionar área geográfica</Btn>
    </div>
  );
}

function TabPerfil({ rede, update }) {
  const perfis = rede.perfis || [];
  const updPerfil = (id, field, val) => update("perfis", perfis.map(p => p.id === id ? { ...p, [field]: val } : p));
  const addPerfil = () => update("perfis", [...perfis, emptyPerfil()]);
  const delPerfil = (id) => update("perfis", perfis.filter(p => p.id !== id));

  const prioColor = { Alta: S.red, Média: S.yellow, Baixa: S.muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {perfis.map((p, idx) => (
        <Panel key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, color: S.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                Perfil #{idx + 1}
              </div>
              {p.posicoes.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  {p.posicoes.map(pos => <span key={pos} style={{ background: `${S.red}22`, border: `1px solid ${S.red}55`, borderRadius: 4, padding: "1px 7px", fontSize: 11, color: S.red, fontWeight: 700 }}>{pos}</span>)}
                </div>
              )}
            </div>
            {perfis.length > 1 && <Btn variant="danger" small onClick={() => delPerfil(p.id)}>Remover</Btn>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Field label="Posições-alvo">
              <MultiPick options={POSICOES} selected={p.posicoes} onChange={v => updPerfil(p.id, "posicoes", v)} />
            </Field>
            <Field label="Idade mínima" half>
              <Input type="number" value={p.idadeMin} onChange={v => updPerfil(p.id, "idadeMin", v)} placeholder="ex: 18" />
            </Field>
            <Field label="Idade máxima" half>
              <Input type="number" value={p.idadeMax} onChange={v => updPerfil(p.id, "idadeMax", v)} placeholder="ex: 25" />
            </Field>
            <Field label="Prioridade" half>
              <Select value={p.prioridade} onChange={v => updPerfil(p.id, "prioridade", v)} options={PRIORIDADES} />
            </Field>
            <Field label="Mercados prioritários">
              <MultiPick options={PAISES} selected={p.mercados} onChange={v => updPerfil(p.id, "mercados", v)} color={S.blue} />
            </Field>
            <Field label="Critérios de avaliação e características pretendidas">
              <Input multiline rows={4} value={p.criterios} onChange={v => updPerfil(p.id, "criterios", v)}
                placeholder="Descreve as características técnicas, táticas e físicas pretendidas para este perfil. Ex: jogador com capacidade de construção em espaços reduzidos, bom passe longo, liderança..." />
            </Field>
          </div>
        </Panel>
      ))}

      <Btn onClick={addPerfil}>+ Adicionar perfil de jogador</Btn>
    </div>
  );
}

function TabKPIs({ rede, update }) {
  const orc = rede.orcamento || {};
  const kpis = rede.kpis || {};
  const updOrc = (field, val) => update("orcamento", { ...orc, [field]: val });
  const updKpi = (field, val) => update("kpis", { ...kpis, [field]: val });

  const orcTotal = Number(orc.total) || 0;
  const orcUsed = [orc.pessoal, orc.deslocacoes, orc.ferramentas, orc.outros].map(Number).reduce((a, b) => a + b, 0);
  const pct = orcTotal > 0 ? Math.min(100, Math.round((orcUsed / orcTotal) * 100)) : 0;
  const overBudget = orcUsed > orcTotal && orcTotal > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <Panel>
        <SectionTitle>KPIs da Rede de Scouting</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Field label="Relatórios por scout / mês" half>
            <Input type="number" value={kpis.relatoriosMes} onChange={v => updKpi("relatoriosMes", v)} placeholder="ex: 6" />
          </Field>
          <Field label="Observações ao vivo / mês (total)" half>
            <Input type="number" value={kpis.obsLive} onChange={v => updKpi("obsLive", v)} placeholder="ex: 20" />
          </Field>
          <Field label="Observações vídeo / mês (total)" half>
            <Input type="number" value={kpis.obsVideo} onChange={v => updKpi("obsVideo", v)} placeholder="ex: 40" />
          </Field>
          <Field label="Taxa de conversão alvo (obs → proposta)" half>
            <Input value={kpis.taxaConversao} onChange={v => updKpi("taxaConversao", v)} placeholder="ex: 5%" />
          </Field>
          <Field label="Cobertura de mercado alvo" half>
            <Input value={kpis.cobertura} onChange={v => updKpi("cobertura", v)} placeholder="ex: 80% dos jogadores elegíveis observados" />
          </Field>
          <Field label="Notas / justificação dos KPIs">
            <Input multiline rows={3} value={kpis.notas} onChange={v => updKpi("notas", v)}
              placeholder="Como foram definidos estes KPIs? Qual é o racional por trás dos números escolhidos?" />
          </Field>
        </div>
      </Panel>

      {/* Budget */}
      <Panel>
        <SectionTitle>Orçamento Estimado</SectionTitle>

        {/* Budget bar */}
        {orcTotal > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: S.muted }}>Distribuição do orçamento</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: overBudget ? "#C46868" : S.green }}>
                {orcUsed.toLocaleString("pt-PT")} € / {orcTotal.toLocaleString("pt-PT")} € ({pct}%)
              </span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: overBudget ? "#C46868" : S.green, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            {overBudget && <div style={{ fontSize: 11, color: "#C46868", marginTop: 4 }}>⚠ A soma das rubricas excede o orçamento total</div>}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Field label="Orçamento total (€)" half>
            <Input type="number" value={orc.total} onChange={v => updOrc("total", v)} placeholder="ex: 150000" />
          </Field>
          <div style={{ flex: "1 1 100%" }} />
          {[["pessoal", "Pessoal (salários e honorários)"], ["deslocacoes", "Deslocações e estadias"], ["ferramentas", "Ferramentas e plataformas"], ["outros", "Outros custos"]].map(([key, lbl]) => (
            <Field key={key} label={`${lbl} (€)`} half>
              <Input type="number" value={orc[key]} onChange={v => updOrc(key, v)} placeholder="0" />
            </Field>
          ))}
          <Field label="Notas sobre o orçamento">
            <Input multiline rows={2} value={orc.notas} onChange={v => updOrc("notas", v)}
              placeholder="Justifica as principais escolhas orçamentais..." />
          </Field>
        </div>
      </Panel>
    </div>
  );
}

// ── main export ──────────────────────────────────────────────────────────────

export default function RedeApp() {
  const [rede, setRede] = useState(loadRede);
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);

  // Auto-save
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(rede)); } catch(e) {}
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [rede]);

  const update = (field, val) => setRede(r => ({ ...r, [field]: val }));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(rede, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rede-scouting-${rede.clube || "clube"}-${rede.epoca || "epoca"}.json`.replace(/\s/g, "_");
    a.click();
  };

  const reset = () => { if (confirm("Limpar toda a rede e começar do zero?")) setRede(emptyRede()); };

  // Quick stats
  const stats = [
    { label: "Membros", value: (rede.membros || []).filter(m => m.nome).length },
    { label: "Áreas", value: (rede.areas || []).filter(a => a.nome).length },
    { label: "Perfis", value: (rede.perfis || []).filter(p => p.posicoes.length > 0).length },
    { label: "Ferramentas", value: (rede.ferramentas || []).length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: S.panel, borderBottom: `2px solid ${S.red}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 18, paddingBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ color: S.red, fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>SPORTRAIL</span>
                <span style={{ fontSize: 11, color: S.muted, letterSpacing: 2, fontWeight: 700 }}>REDE DE SCOUTING</span>
              </div>
              {rede.clube && (
                <div style={{ fontSize: 13, color: S.text, fontWeight: 700, marginTop: 2 }}>
                  {rede.clube}{rede.epoca ? ` · ${rede.epoca}` : ""}{rede.escalao ? ` · ${rede.escalao}` : ""}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {saved && <span style={{ fontSize: 11, color: S.green }}>✓ guardado</span>}
              <a href="/" style={{ fontSize: 11, color: S.muted, textDecoration: "none", padding: "6px 12px", border: `1px solid ${S.border}`, borderRadius: 6 }}>← Relatórios</a>
              <Btn small onClick={exportJSON}>Exportar JSON</Btn>
              <Btn small variant="ghost" onClick={reset}>Limpar</Btn>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 20, paddingBottom: 14 }}>
            {stats.map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.value > 0 ? S.red : S.muted, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: S.muted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: -1 }}>
            {TABS.map((t, i) => (
              <button key={t} type="button" onClick={() => setTab(i)}
                style={{ background: "transparent", border: "none", borderBottom: tab === i ? `2px solid ${S.red}` : "2px solid transparent", color: tab === i ? S.text : S.muted, fontSize: 12, fontWeight: tab === i ? 700 : 400, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
        {tab === 0 && <TabClube rede={rede} update={update} />}
        {tab === 1 && <TabDepartamento rede={rede} update={update} />}
        {tab === 2 && <TabAreas rede={rede} update={update} />}
        {tab === 3 && <TabPerfil rede={rede} update={update} />}
        {tab === 4 && <TabKPIs rede={rede} update={update} />}
      </div>
    </div>
  );
}
