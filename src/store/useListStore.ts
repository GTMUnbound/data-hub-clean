import { create } from "zustand";
import { ContactList, ContactRecord } from "@/types";
import { mockLists } from "@/lib/mock-data";

interface ListStore {
  lists: ContactList[];
  addList: (name: string) => string;
  getList: (id: string) => ContactList | undefined;
  addRecords: (listId: string, records: ContactRecord[]) => void;
  updateRecord: (listId: string, recordId: string, updates: Partial<ContactRecord>) => void;
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
}));
