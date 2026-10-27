"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Wrong email or password");
      return;
    }
    router.push("/");
  }

  return (
    <div className="login-page">
      {/* left side with logo */}
      <div className="login-side">
        <img src="/jaago-logo.png" alt="JAAGO Foundation" className="login-logo" />
        <h1>PSE CRM</h1>
        <p>Private Sector Engagement</p>
      </div>

      {/* right side with form */}
      <div className="login-main">
        <form onSubmit={handleLogin} className="login-box">
          <h2>Welcome back</h2>
          <p className="subtitle">Log in to continue</p>

          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <p className="error">{error}</p>}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
