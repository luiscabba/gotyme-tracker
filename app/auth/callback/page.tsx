"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { askReset, markUnlocked } from "@/lib/lock";

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [err, setErr] = useState("");
  useEffect(() => {
    const code = params.get("code");
    const sb = supabase();
    (async () => {
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) { setErr("This sign-in link expired or was opened on another device. Request a new one."); return; }
      }
      markUnlocked();
      askReset(true);
      router.replace("/");
    })();
  }, [params, router]);
  return (
    <div className="wrap" style={{ paddingTop: "18vh" }}>
      <div className="tile">
        {err ? <><span className="banner">{err}</span><a className="btn" href="/login">Back to sign in</a></> : <span className="sub">Signing you in</span>}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Callback /></Suspense>;
}
