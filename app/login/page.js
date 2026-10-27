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
    <div className="login-box">
      <h2>PSE CRM - Login</h2>
      <form onSubmit={handleLogin}>
        <p>
          Email<br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </p>
        <p>
          Password<br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </p>
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
