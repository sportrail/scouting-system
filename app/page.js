import dynamic from "next/dynamic";

// Disable SSR: the app reads localStorage during state initialization.
// Without this, Next.js pre-renders with an empty store (no localStorage on server),
// then React hydrates with the actual data → mismatch → hydration errors #418/#423/#425.
const ScoutingApp = dynamic(() => import("./ScoutingApp"), {
  ssr: false,
  loading: () => <div style={{ background: "#0B0A0F", minHeight: "100vh" }} />,
});

export default function Page({ searchParams }) {
  // Scouting Mesh deep-link params:
  //   ?mesh_id=42&nome=João Silva&clube=Estrela&pos=MC
  const meshParams = {
    meshPlayerId: searchParams?.mesh_id ? Number(searchParams.mesh_id) : null,
    nome:  searchParams?.nome  || "",
    clube: searchParams?.clube || "",
    pos:   searchParams?.pos   || "",
  };
  return <ScoutingApp meshParams={meshParams} />;
}
