import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "تسجيل الدخول | علو العقارية" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }
    throw redirect({ to: "/admin" }) ?? navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-black text-navy text-center mb-8">
          تسجيل الدخول
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6">
          <div>
            <label className="block text-sm mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-background px-3 text-right"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-background px-3 text-right"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-navy text-navy-foreground font-semibold disabled:opacity-50"
          >
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>
      </main>
    </div>
  );
}
