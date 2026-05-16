import { createClient as createServerClient } from "../../../lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req) {
  try {
    const body = await req.json();
    const { report_id, owner_id, course_code, grade, comment, player_name } = body;

    if (!report_id || !owner_id || !course_code || grade == null) {
      return Response.json({ error: "Campos obrigatórios em falta." }, { status: 400 });
    }
    if (grade < 0 || grade > 20) {
      return Response.json({ error: "Nota deve ser entre 0 e 20." }, { status: 400 });
    }

    // Verify caller is authenticated
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

    // Verify caller is a trainer for this course
    const { data: trainerEntry } = await supabase
      .from("course_trainers")
      .select("course_code")
      .eq("trainer_id", user.id)
      .eq("course_code", course_code)
      .limit(1);

    if (!trainerEntry?.length) {
      return Response.json({ error: "Acesso negado — não é formador deste curso." }, { status: 403 });
    }

    // Look up student email via service role (auth.users is not accessible with anon key)
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: studentData, error: userErr } = await adminClient.auth.admin.getUserById(owner_id);
    if (userErr || !studentData?.user?.email) {
      return Response.json({ error: "Não foi possível obter o email do aluno." }, { status: 404 });
    }
    const studentEmail = studentData.user.email;

    // Save / update feedback in DB
    const { error: dbError } = await supabase
      .from("report_feedback")
      .upsert({
        report_id,
        formador_id: user.id,
        grade,
        comment: comment || "",
        sent_at: new Date().toISOString(),
      }, { onConflict: "report_id,formador_id" });

    if (dbError) {
      console.error("Feedback upsert error:", dbError);
      return Response.json({ error: "Erro ao guardar feedback." }, { status: 500 });
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || "Sportrail <noreply@sportrail.pt>";

    const { error: emailErr } = await resend.emails.send({
      from,
      to: studentEmail,
      subject: `Feedback do formador — ${player_name || "Relatório de Scouting"}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0B0A0F; color: #f5f5f5; padding: 32px; border-radius: 12px;">
          <div style="color: #ED1C24; font-size: 22px; font-weight: 900; letter-spacing: 2px; margin-bottom: 4px;">SPORTRAIL</div>
          <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">Scouting System</div>

          <div style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Recebeste feedback do teu formador</div>

          ${player_name ? `<div style="font-size: 13px; color: #888; margin-bottom: 8px;">Relatório: <strong style="color: #f5f5f5;">${player_name}</strong></div>` : ""}

          <div style="background: #13121a; border: 1px solid #2a2a2f; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Nota atribuída</div>
            <div style="font-size: 48px; font-weight: 900; color: #ED1C24; line-height: 1;">${grade}<span style="font-size: 20px; color: #666;">/20</span></div>
          </div>

          ${comment ? `
          <div style="background: #13121a; border: 1px solid #2a2a2f; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Comentário do formador</div>
            <div style="font-size: 14px; line-height: 1.6; color: #f5f5f5;">${comment.replace(/\n/g, "<br/>")}</div>
          </div>
          ` : ""}

          <a href="https://scouting.sportrail.pt" style="display: inline-block; background: #ED1C24; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px;">Aceder à plataforma →</a>

          <div style="margin-top: 32px; font-size: 11px; color: #444;">
            Sportrail · scouting.sportrail.pt
          </div>
        </div>
      `,
    });

    if (emailErr) {
      console.error("Resend email error:", emailErr);
      // Don't fail the whole request — feedback is saved, only email failed
      return Response.json({ ok: true, emailWarning: "Feedback guardado mas email falhou." });
    }

    return Response.json({ ok: true });

  } catch (err) {
    console.error("Feedback route error:", err);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}

// Formador fetches existing feedback for a specific report
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const report_id = searchParams.get("report_id");
  if (!report_id) return Response.json({ error: "report_id obrigatório." }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const { data, error } = await supabase
    .from("report_feedback")
    .select("grade, comment, sent_at")
    .eq("report_id", report_id)
    .eq("formador_id", user.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ feedback: data || null });
}
