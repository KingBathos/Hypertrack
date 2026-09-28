import { redirect } from "next/navigation";

// ──────────────────────────────────────────────────
// Página raíz — Redirige a /register (temporal)
// ──────────────────────────────────────────────────

export default function Home() {
  redirect("/register");
}
