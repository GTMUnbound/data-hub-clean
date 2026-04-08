import { create } from "zustand";
import { ContactList, ContactRecord } from "@/types";
import { mockLists } from "@/lib/mock-data";

interface ListStore {
  lists: ContactList[];
  addList: (name: string) => string;
  getList: (id: string) => ContactList | undefined;
  addRecords: (listId: string, records: ContactRecord[]) => void;
  updateRecord: (listId: string, recordId: string, updates: Partial<ContactRecord>) => void;
  deleteRecords: (listId: string, recordIds: string[]) => void;
  bulkTagRecords: (listId: string, recordIds: string[], tags: string[]) => void;
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: mockLists,
  addList: (name: string) => {
    const id = `list-${Date.now()}`;
    set((s) => ({
      lists: [...s.lists, { id, name, created_at: new Date().toISOString(), records: [] }],
    }));
    return id;
  },
  getList: (id: string) => get().lists.find((l) => l.id === id),
  addRecords: (listId, records) =>
    set((s) => ({
      lists: s.lists.map((l) => (l.id === listId ? { ...l, records: [...l.records, ...records] } : l)),
    })),
  updateRecord: (listId, recordId, updates) =>
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, records: l.records.map((r) => (r.id === recordId ? { ...r, ...updates } : r)) }
          : l
      ),
    })),
  deleteRecords: (listId, recordIds) =>
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, records: l.records.filter((r) => !recordIds.includes(r.id)) }
          : l
      ),
    })),
  bulkTagRecords: (listId, recordIds, tags) =>
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              records: l.records.map((r) =>
                recordIds.includes(r.id)
                  ? { ...r, tags: [...new Set([...r.tags, ...tags])] }
                  : r
              ),
            }
          : l
      ),
    })),
}));
