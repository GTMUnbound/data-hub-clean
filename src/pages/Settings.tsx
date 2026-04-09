import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserWithRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [myRole, setMyRole] = useState<string>("member");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);

  // ── Load current user's role ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setMyRole(data.role);
      });
  }, [user]);

  // ── Load all users + roles (admin only) ──────────────────────
  useEffect(() => {
    if (myRole !== "admin") {
      setLoadingUsers(false);
      return;
    }
    async function loadUsers() {
      setLoadingUsers(true);
      // user_roles has user_id; we can't query auth.users directly.
      // We fetch what's visible via user_roles table.
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) { setLoadingUsers(false); return; }

      // Map to display rows (email not available without admin API)
      const mapped: UserWithRole[] = (roles ?? []).map((r) => ({
        id: r.user_id,
        email: r.user_id === user?.id ? (user.email ?? r.user_id) : r.user_id.slice(0, 8) + "…",
        role: r.role,
        created_at: "",
      }));
      setUsers(mapped);
      setLoadingUsers(false);
    }
    loadUsers();
  }, [myRole, user]);

  // ── Invite user via magic link ───────────────────────────────
  const handleInvite = async () => {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Enter a valid email address.");
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
      toast.success(`Invite sent to ${trimmed}`);
      setInviteEmail("");
    }
  };

  // ── Change a user's role (admin only) ────────────────────────
  const handleRoleChange = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role })
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast.success("Role updated.");
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b bg-background px-4 sm:px-8 py-3.5 sm:py-5 flex items-center gap-2 sm:gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight leading-none mb-1 truncate">Settings</h1>
          <p className="text-[10px] sm:text-sm text-muted-foreground uppercase sm:normal-case tracking-wider sm:tracking-normal font-medium mt-0.5 truncate">Account & management</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">

        {/* Current user */}
        <div className="bg-background rounded-lg border shadow-sm">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-medium text-muted-foreground">Your Account</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize font-medium">{myRole}</span>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Invite */}
        {myRole === "admin" && (
          <div className="bg-background rounded-lg border shadow-sm">
            <div className="px-5 py-3.5 border-b">
              <h2 className="text-sm font-medium text-muted-foreground">Invite User</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-muted-foreground mb-3">
                Send a magic link to invite someone to this workspace.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  className="text-sm"
                  disabled={sending}
                />
                <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()} size="sm" className="gap-1.5">
                  {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {sending ? "Sending…" : "Send Invite"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users table */}
        {myRole === "admin" && (
          <div className="bg-background rounded-lg border shadow-sm">
            <div className="px-5 py-3.5 border-b">
              <h2 className="text-sm font-medium text-muted-foreground">All Users</h2>
            </div>
            {loadingUsers ? (
              <div className="px-5 py-4 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-8 bg-secondary rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium truncate max-w-xs">{u.email}</span>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={u.id === user?.id}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="px-5 py-6 text-sm text-muted-foreground text-center">
                    No users found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
