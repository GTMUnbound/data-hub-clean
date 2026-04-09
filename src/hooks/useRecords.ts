import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContactRecord } from "@/types";

// ── Map Supabase row → ContactRecord ─────────────────────────
function toContactRecord(row: any): ContactRecord & { is_duplicate: boolean } {
  return {
    id: row.id,
    full_name: row.full_name ?? "",
    email: row.email ?? "",
    company: row.company ?? "",
    title: row.title ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    source: row.source ?? "",
    notes: row.notes ?? "",
    tags: row.tags ?? [],
    is_duplicate: row.is_duplicate ?? false,
  };
}

// ── Fetch all records for a list (paginated at query level) ───
export function useRecords(listId: string | undefined) {
  return useQuery({
    queryKey: ["records", listId],
    enabled: !!listId,
    queryFn: async () => {
      if (!listId) return [];
      // Fetch up to 10 000 rows – Supabase default limit is 1000, override it
      const { data, error } = await supabase
        .from("records")
        .select("*")
        .eq("list_id", listId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(10000);

      if (error) throw error;
      return (data ?? []).map(toContactRecord);
    },
  });
}

// ── Bulk insert records ───────────────────────────────────────
export function useAddRecords() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, records }: { listId: string; records: Omit<ContactRecord, "id">[] }) => {
      const rows = records.map((r) => ({
        list_id: listId,
        full_name: r.full_name.trim(),
        email: r.email.trim().toLowerCase(),
        company: r.company.trim(),
        title: r.title.trim(),
        city: r.city.trim(),
        country: r.country.trim(),
        source: r.source.trim(),
        notes: r.notes.trim(),
        tags: r.tags.map((t) => t.trim()).filter(Boolean),
      }));

      // Insert in chunks of 500 to avoid request size limits
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase.from("records").insert(rows.slice(i, i + CHUNK));
        if (error) throw error;
      }

      // Run duplicate detection on the server
      await supabase.rpc("mark_duplicates", { p_list_id: listId });
    },
    onSuccess: (_data, { listId }) => {
      qc.invalidateQueries({ queryKey: ["records", listId] });
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success("Records imported successfully.");
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });
}

// ── Update a single record ────────────────────────────────────
export function useUpdateRecord(listId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, updates }: { recordId: string; updates: Partial<ContactRecord> }) => {
      const { error } = await supabase
        .from("records")
        .update({
          ...(updates.full_name !== undefined && { full_name: updates.full_name }),
          ...(updates.email !== undefined && { email: updates.email }),
          ...(updates.company !== undefined && { company: updates.company }),
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.city !== undefined && { city: updates.city }),
          ...(updates.country !== undefined && { country: updates.country }),
          ...(updates.source !== undefined && { source: updates.source }),
          ...(updates.notes !== undefined && { notes: updates.notes }),
          ...(updates.tags !== undefined && { tags: updates.tags }),
        })
        .eq("id", recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["records", listId] });
    },
    onError: (err: Error) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });
}

// ── Delete records (soft-delete via is_active=false) ─────────
export function useDeleteRecords(listId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (recordIds: string[]) => {
      const { error } = await supabase
        .from("records")
        .update({ is_active: false })
        .in("id", recordIds);
      if (error) throw error;
    },
    onSuccess: (_data, recordIds) => {
      qc.invalidateQueries({ queryKey: ["records", listId] });
      qc.invalidateQueries({ queryKey: ["lists"] });
      toast.success(`${recordIds.length} record(s) deleted.`);
    },
    onError: (err: Error) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });
}

// ── Bulk-tag records ──────────────────────────────────────────
export function useBulkTagRecords(listId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordIds, tags }: { recordIds: string[]; tags: string[] }) => {
      // We need to fetch current tags and merge — no array_append in Supabase client
      const { data, error: fetchError } = await supabase
        .from("records")
        .select("id, tags")
        .in("id", recordIds);
      if (fetchError) throw fetchError;

      const updates = (data ?? []).map((r) => ({
        id: r.id,
        tags: [...new Set([...(r.tags ?? []), ...tags])],
      }));

      for (const upd of updates) {
        const { error } = await supabase.from("records").update({ tags: upd.tags }).eq("id", upd.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["records", listId] });
      toast.success("Tags applied.");
    },
    onError: (err: Error) => {
      toast.error(`Tagging failed: ${err.message}`);
    },
  });
}
