import { useLists, useCreateList, useUpdateList, useDeleteList } from "@/hooks/useLists";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Settings, LogOut, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ListOverview = () => {
  const { data: lists = [], isLoading } = useLists();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const deleteList = useDeleteList();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createList.mutateAsync(newName.trim());
    setOpen(false);
    setNewName("");
    navigate(`/list/${id}`);
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b bg-background px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src="/logo.png" alt="GTM Unbound" className="h-6 sm:h-8 w-auto" />
          <div className="h-5 sm:h-6 w-px bg-border mx-0.5 sm:mx-1" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight leading-none mb-0.5 truncate">GTM Unbound</h1>
            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate">Data Control Center</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="h-8 w-8 hover:bg-secondary"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 hover:bg-secondary"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
          <Button onClick={() => setOpen(true)} size="sm" className="gap-1.5 h-8 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">New List</span>
            <span className="xs:hidden">New</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="bg-background rounded-lg border shadow-sm">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-medium text-muted-foreground">All Lists</h2>
          </div>
          <div className="divide-y">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between animate-pulse">
                  <div className="h-4 bg-secondary rounded w-48" />
                  <div className="flex gap-8">
                    <div className="h-4 bg-secondary rounded w-24" />
                    <div className="h-4 bg-secondary rounded w-16" />
                  </div>
                </div>
              ))
            ) : (
              lists.map((list) => {
                const isEditing = editingListId === list.id;
                return (
                  <div
                    key={list.id}
                    className="w-full text-left px-4 sm:px-5 py-3 sm:py-3.5 table-row-hover flex flex-col sm:flex-row sm:items-center justify-between group gap-2 sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm w-full sm:w-64"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editName.trim()) {
                                updateList.mutate({ id: list.id, name: editName.trim() }, {
                                  onSuccess: () => setEditingListId(null)
                                });
                              } else if (e.key === "Escape") {
                                setEditingListId(null);
                              }
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 shrink-0" onClick={() => {
                            if (editName.trim()) {
                              updateList.mutate({ id: list.id, name: editName.trim() }, {
                                onSuccess: () => setEditingListId(null)
                              });
                            }
                          }}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0" onClick={() => setEditingListId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/list/${list.id}`)}
                          className="font-semibold sm:font-medium text-base sm:text-sm group-hover:text-primary transition-colors text-left truncate w-full"
                        >
                          {list.name}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-[11px] sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="sm:w-32 sm:text-right pointer-events-none">
                          {new Date(list.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="sm:w-20 sm:text-right tabular-nums pointer-events-none font-medium text-foreground sm:text-muted-foreground">
                          {list.record_count ?? 0} records
                        </span>
                      </div>
                      
                      {/* Action Menu */}
                      <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-secondary"
                          onClick={() => {
                            setEditingListId(list.id);
                            setEditName(list.name);
                          }}
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${list.name}"? This will delete all records immediately.`)) {
                              deleteList.mutate(list.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!isLoading && lists.length === 0 && (
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
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createList.isPending}
            >
              {createList.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListOverview;
