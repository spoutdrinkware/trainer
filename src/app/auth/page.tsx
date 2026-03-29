"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0f] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-[#c8441a]">75</span>
            <span className="text-white ml-1.5">HARD</span>
          </h1>
          <p className="text-[#6b7280] text-sm mt-2">Sign in to your tracker</p>
        </div>

        {sent ? (
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-[#22c55e]" />
            </div>
            <h2 className="text-lg font-bold text-white">Check your email</h2>
            <p className="text-sm text-[#6b7280]">
              Magic link sent to <span className="text-white font-medium">{email}</span>
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-[#c8441a] hover:underline mt-2"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full bg-[#111118] border border-[#1e1e2e] rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#c8441a]/50"
              />
            </div>

            {error && (
              <p className="text-xs text-[#ef4444]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#c8441a] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e05a2e] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Send Magic Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
