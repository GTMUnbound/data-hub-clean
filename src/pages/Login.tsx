import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Already logged in
  if (!loading && session) return <Navigate to="/" replace />;

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <img src="/logo.png" alt="GTM Unbound" className="h-16 w-auto" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">GTM Unbound</h1>
            <p className="text-xs text-muted-foreground">Sign in to manage your data lists</p>
          </div>
        </div>

        <div className="bg-background border rounded-xl px-6 py-7 shadow-sm">
          {sent ? (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Check your inbox</p>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
                Click it to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-muted-foreground underline underline-offset-4 mt-3 block mx-auto"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-1">Sign in</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Enter your email and we'll send you a magic link.
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  autoFocus
                  disabled={sending}
                />
                <Button
                  className="w-full"
                  onClick={handleSend}
                  disabled={sending || !email.trim()}
                >
                  {sending ? "Sending…" : "Send Magic Link"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
