"use client";

import { useState } from "react";
import { supabase, usernameEmail } from "@/lib/supabase";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Entre com sua conta de jogador.");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username.trim() || !password) return setMessage("Informe usuário e senha.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameEmail(username), password });
    setLoading(false);
    if (error) return setMessage("Usuário ou senha inválidos.");
    onLoggedIn();
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="brand">RUPTERYA</span>
        <h1>Entrar no jogo</h1>
        <p>Seu progresso fica protegido e disponível em qualquer computador.</p>
        <label>Usuário<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void login()} /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void login()} /></label>
        <button className="primary" disabled={loading} onClick={() => void login()}>{loading ? "Entrando..." : "Entrar"}</button>
        <small>{message}</small>
      </section>
    </main>
  );
}
