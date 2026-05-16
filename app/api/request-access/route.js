import { Resend } from "resend";

export async function POST(req) {
  try {
    const { name, email } = await req.json();
    if (!name || !email) {
      return Response.json({ error: "Nome e email obrigatórios." }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from   = process.env.RESEND_FROM_EMAIL || "Sportrail <noreply@sportrail.pt>";

    const { error } = await resend.emails.send({
      from,
      to: "geral@sportrail.pt",
      subject: `Pedido de acesso — ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color: #ED1C24;">Novo pedido de acesso</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p>Para aprovar, cria o utilizador no Supabase Dashboard → Authentication → Users → Invite user.</p>
        </div>
      `,
    });

    if (error) {
      console.error("request-access email error:", error);
      return Response.json({ error: "Erro ao enviar email." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("request-access error:", err);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
