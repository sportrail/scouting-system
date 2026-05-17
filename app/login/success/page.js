"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

// After OTP verification: confirm session, detect trainer role, redirect.

// Shown after a successful magic link login. Confirms the session,
// displays the user's email, and — in this Parte 1 — acts as a dead-end
// that confirms auth works. Parte 2 will wire this to the main app.

const S = {
  bg: "#0B0D1A",
  panel: "#161929",
  border: "#2A2E48",
  red: "#DDB85C",
  text: "#E8EAF2",
  muted: "#5E6383",
  green: "#22c55e",
};

export default function LoginSuccessPage() {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [isTrainer, setIsTrainer] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      setUser(u);

      if (u) {
        const { data: tc } = await supabase
          .from("course_trainers")
          .select("course_code")
          .eq("trainer_id", u.id)
          .limit(1);
        if (tc?.length > 0) setIsTrainer(true);
      }

      setLoading(false);
    };
    run();
  }, []);

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={brandStyle}>S³</div>
        <div style={subBrandStyle}>SPORTRAIL SCOUTING SYSTEM</div>

        {loading ? (
          <div style={{ marginTop: 40, textAlign: "center", fontSize: 13, color: S.muted }}>
            A verificar sessão…
          </div>
        ) : user ? (
          <>
            <div style={{ marginTop: 30, textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: S.green, marginBottom: 10 }}>
                Sessão iniciada
              </div>
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.5 }}>
                Autenticado como<br/>
                <strong style={{ color: S.text }}>{user.email}</strong>
              </div>
            </div>

            {isTrainer ? (
              <a
                href="/formador"
                style={{ ...btnStyle, display: "block", textAlign: "center", background: S.red, color: "#fff", textDecoration: "none", marginTop: 24 }}
              >
                Ir para o Painel do Formador →
              </a>
            ) : (
              <a
                href="/"
                style={{ ...btnStyle, display: "block", textAlign: "center", background: S.red, color: "#fff", textDecoration: "none", marginTop: 24 }}
              >
                Entrar na plataforma →
              </a>
            )}

            <button onClick={onSignOut} style={{ ...btnStyle, background: "transparent", color: S.muted, border: `1px solid ${S.border}`, marginTop: 14 }}>
              Terminar sessão
            </button>
          </>
        ) : (
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: S.muted, marginBottom: 16 }}>
              Não há sessão activa.
            </div>
            <a href="/login" style={{ ...btnStyle, background: S.red, color: "#fff", textDecoration: "none", display: "inline-block" }}>
              Ir para Login
            </a>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: "#2A2E48", marginTop: 20 }}>
        scouting.sportrail.pt
      </div>
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background: S.bg,
  color: S.text,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const cardStyle = {
  width: "100%",
  maxWidth: 400,
  background: S.panel,
  border: `1px solid ${S.border}`,
  borderRadius: 16,
  padding: "36px 30px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

const brandStyle = {
  color: S.red,
  fontSize: 48,
  fontWeight: 900,
  textAlign: "center",
  letterSpacing: 2,
  lineHeight: 1,
};

const subBrandStyle = {
  color: S.muted,
  fontSize: 10,
  textAlign: "center",
  letterSpacing: 2,
  marginTop: 6,
  fontWeight: 700,
};

const btnStyle = {
  width: "100%",
  padding: "12px 16px",
  border: "none",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
