"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

// S³ Sportrail Scouting — Login
// Flow: email → OTP code (shouldCreateUser: false — only pre-registered users)

const S = {
  bg: "#0B0A0F",
  panel: "#13121a",
  border: "#2a2a2f",
  red: "#ED1C24",
  text: "#f5f5f5",
  muted: "#888",
  green: "#22c55e",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | code_sent | verifying | error
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) {
      setStatus("error");
      setErrorMsg("Introduz um email válido.");
      return;
    }

    setStatus("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: em,
        options: { shouldCreateUser: false },
      });

      if (error) {
        // Supabase returns an error when the email is not registered
        const notFound =
          error.message?.toLowerCase().includes("signups not allowed") ||
          error.message?.toLowerCase().includes("not found") ||
          error.status === 422 ||
          error.status === 400;
        setStatus("error");
        setErrorMsg(
          notFound
            ? "Este email não está registado na plataforma. Contacta a Sportrail."
            : error.message || "Erro ao enviar o código. Tenta de novo."
        );
        return;
      }

      setStatus("code_sent");
    } catch (err) {
      console.error("OTP send error:", err);
      setStatus("error");
      setErrorMsg("Erro de rede. Verifica a tua ligação e tenta de novo.");
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const token = otpCode.trim();
    if (!token || token.length < 6) {
      setStatus("error");
      setErrorMsg("Introduz o código que recebeste no email.");
      setTimeout(() => setStatus("code_sent"), 2000);
      return;
    }

    setStatus("verifying");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "email",
      });

      if (error) throw error;

      window.location.href = "/login/success";
    } catch (err) {
      console.error("OTP verify error:", err);
      setOtpCode("");
      setStatus("code_sent");
      setErrorMsg(err?.message || "Código inválido ou expirado. Verifica o email e tenta de novo.");
    }
  };

  const isBusy = status === "sending" || status === "verifying";

  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={brandStyle}>S³</div>
        <div style={subBrandStyle}>SPORTRAIL SCOUTING SYSTEM</div>

        {/* Step 2: Enter OTP code */}
        {status === "code_sent" || status === "verifying" ? (
          <div style={{ marginTop: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📧</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Código enviado</div>
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.5 }}>
                Enviámos um código de 8 dígitos para<br />
                <strong style={{ color: S.text }}>{email}</strong>
              </div>
            </div>
            <form onSubmit={onVerifyOtp}>
              <label style={labelStyle}>Código de acesso</label>
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="00000000"
                autoComplete="one-time-code"
                disabled={status === "verifying"}
                maxLength={8}
                style={{ ...inputStyle, fontSize: 24, textAlign: "center", letterSpacing: 6, fontWeight: 700 }}
                autoFocus
              />
              <div style={{ fontSize: 11, color: S.muted, marginTop: 4, marginBottom: 22 }}>
                Verifica o email (e a pasta de spam). O código expira em 1 hora.<br/>
                Copia e cola o código directamente do email.
              </div>
              {errorMsg && (
                <div style={errorBox}>{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={status === "verifying"}
                style={{ ...btnStyle, background: status === "verifying" ? "#555" : S.red, cursor: status === "verifying" ? "wait" : "pointer" }}
              >
                {status === "verifying" ? "A verificar..." : "Entrar"}
              </button>
            </form>

            <button
              onClick={() => { setStatus("idle"); setOtpCode(""); setErrorMsg(""); }}
              style={{ ...btnStyle, background: "transparent", color: S.muted, marginTop: 14, fontSize: 12 }}
            >
              ← Voltar
            </button>
          </div>
        ) : (
          /* Step 1: Enter email */
          <form onSubmit={onSubmit} style={{ marginTop: 28 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teu@email.pt"
              autoComplete="email"
              disabled={isBusy}
              style={inputStyle}
              autoFocus
            />
            <div style={{ fontSize: 11, color: S.muted, marginTop: 6, marginBottom: 22 }}>
              Vamos enviar-te um código de acesso para este email.
            </div>

            {errorMsg && (
              <div style={errorBox}>{errorMsg}</div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              style={{ ...btnStyle, background: isBusy ? "#555" : S.red, cursor: isBusy ? "wait" : "pointer" }}
            >
              {status === "sending" ? "A enviar..." : "Receber código de acesso"}
            </button>
          </form>
        )}

        <div style={{ fontSize: 11, color: "#555", textAlign: "center", marginTop: 28, lineHeight: 1.5 }}>
          Ao entrares, concordas com os termos de<br/>utilização da Sportrail.
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#444", marginTop: 20 }}>
        scouting.sportrail.pt
      </div>
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh", background: S.bg, color: S.text,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "20px", boxSizing: "border-box",
};
const cardStyle = {
  width: "100%", maxWidth: 400, background: S.panel,
  border: `1px solid ${S.border}`, borderRadius: 16,
  padding: "36px 30px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};
const brandStyle = { color: S.red, fontSize: 48, fontWeight: 900, textAlign: "center", letterSpacing: 2, lineHeight: 1 };
const subBrandStyle = { color: S.muted, fontSize: 10, textAlign: "center", letterSpacing: 2, marginTop: 6, fontWeight: 700 };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };
const inputStyle = {
  width: "100%", background: S.bg, border: `1px solid ${S.border}`,
  color: S.text, fontSize: 16, padding: "14px 14px",
  borderRadius: 10, boxSizing: "border-box", fontFamily: "inherit", outline: "none",
};
const btnStyle = {
  width: "100%", padding: "14px 16px", background: S.red, color: "#fff",
  border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800,
  letterSpacing: 1, cursor: "pointer", fontFamily: "inherit",
};

const errorBox = {
  padding: "10px 12px",
  background: "rgba(237,28,36,0.1)",
  border: `1px solid ${S.red}`,
  borderRadius: 8,
  color: S.red,
  fontSize: 13,
  marginBottom: 14,
};
