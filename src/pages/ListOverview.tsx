import { useListStore } from "@/store/useListStore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ListOverview = () => {
  const { lists, addList } = useListStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = addList(newName.trim());
    setOpen(false);
    setNewName("");
    navigate(`/list/${id}`);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b bg-background px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">GTM Unbound</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Data Admin</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create New List
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8">
        <div className="bg-background rounded-lg border shadow-sm">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-medium text-muted-foreground">All Lists</h2>
          </div>
          <div className="divide-y">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => navigate(`/list/${list.id}`)}
                className="w-full text-left px-5 py-3.5 table-row-hover flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm group-hover:text-primary transition-colors">
                    {list.name}
                  </span>
                </div>
                <div className="flex items-center gap-8 text-sm text-muted-foreground">
                  <span className="w-32 text-right">
                    {new Date(list.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="w-20 text-right tabular-nums">
                    {list.records.length} records
                  </span>
                </div>
              </button>
            ))}
            {lists.length === 0 && (
              <div className="px-5 py-12 text-center text-muted-foreground text-sm">
                No lists yet. Create one to get started.
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="e.g. Enterprise Leads Q2"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListOverview;
