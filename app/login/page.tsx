"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, OWNER_EMAIL } from "@/lib/supabase";
import { useData } from "@/lib/store";

export default function Login() {
  const { session } = useData();
  const router = useRouter();
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => { if (session) router.replace("/"); }, [session, router]);

  async function send() {
    setState("sending");
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setState("error"); setMsg(error.message); } else setState("sent");
  }

  return (
    <div className="wrap" style={{ paddingTop: "18vh" }}>
      <div className="top"><h1>Reset your passcode</h1></div>
      <span className="sub" style={{ padding: "0 6px" }}>We will email you a link. Open it on this device, then choose a new passcode.</span>
      <form className="tile" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Email me a link"}</button>
        {state === "sent" && <span className="sub">Check your inbox and open the link on this device.</span>}
        {state === "error" && <span className="banner">{msg}</span>}
        <a href="/" className="sub" style={{ textAlign: "center" }}>Back to passcode</a>
      </form>
    </div>
  );
}
