import dynamic from "next/dynamic";

// RedeSimples — versão para alunos (iniciante)
// RedeApp     — versão completa, reservada para uso futuro/comercial
const RedeSimples = dynamic(() => import("./RedeSimples"), {
  ssr: false,
  loading: () => <div style={{ background: "#0B0D1A", minHeight: "100vh" }} />,
});

export default function RedePage() {
  return <RedeSimples />;
}
