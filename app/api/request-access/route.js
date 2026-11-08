import { createClient } from "@supabase/supabase-js";

// Regista um pedido de acesso na tabela public.access_requests.
//
// Sem Resend: a Sportrail revê os pedidos no Dashboard do Supabase e aprova
// criando o utilizador em Authentication → Users. O insert é feito com a anon
// key — a política RLS "Qualquer um submete pedido de acesso" permite apenas
// INSERT (nunca SELECT), por isso emails de terceiros não ficam expostos.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const name = (body?.name || "").trim();
  const email = (body?.email || "").trim().toLowerCase();

  if (name.length < 2) {
    return Response.json({ error: "Indica o teu nome." }, { status: 400 });
  }
  if (!email || !email.includes("@") || email.length > 254) {
    return Response.json({ error: "Indica um email válido." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return Response.json({ error: "Serviço indisponível de momento." }, { status: 503 });
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("access_requests")
    .insert({ name, email });

  if (error) {
    // 23505 = unique_violation → já existe um pedido pendente para este email.
    // Tratamos como sucesso para não revelar o estado nem irritar o utilizador.
    if (error.code === "23505") {
      return Response.json({ ok: true, duplicate: true });
    }
    console.error("request-access insert error:", error);
    return Response.json(
      { error: "Não foi possível registar o pedido. Tenta mais tarde." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
