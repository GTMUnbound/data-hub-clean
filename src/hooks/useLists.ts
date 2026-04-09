import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ListRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  record_count?: number;
}

// ── Fetch all lists for the current user ─────────────────────
export function useLists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lists", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ListRow[]> => {
      const { data, error } = await supabase
        .from("lists")
        .select("id, name, created_by, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch record counts in a second query (aggregation not in free RLS view)
      const ids = (data ?? []).map((l) => l.id);
      if (ids.length === 0) return data ?? [];

      const { data: counts } = await supabase
        .from("records")
        .select("list_id")
        .in("list_id", ids)
        .eq("is_active", true);

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach((r) => {
        countMap[r.list_id] = (countMap[r.list_id] ?? 0) + 1;
      });

      return (data ?? []).map((l) => ({ ...l, record_count: countMap[l.id] ?? 0 }));
    },
  });
}

// ── Create a new list ────────────────────────────────────────
export function useCreateList() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("lists")
        .insert({ name, created_by: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create list: ${err.message}`);
    },
  });
}

// ── Update a list ────────────────────────────────────────────
export function useUpdateList() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("lists")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success("List renamed.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to rename list: ${err.message}`);
    },
  });
}

// ── Delete a list ────────────────────────────────────────────
export function useDeleteList() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success("List deleted.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete list: ${err.message}`);
    },
  });
}
