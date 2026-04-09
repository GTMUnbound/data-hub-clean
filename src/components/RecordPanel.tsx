import { ContactRecord } from "@/types";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface RecordPanelProps {
  record: ContactRecord;
  onClose: () => void;
  onUpdate: (updates: Partial<ContactRecord>) => void;
}

export function RecordPanel({ record, onClose, onUpdate }: RecordPanelProps) {
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState(record.notes);
  const [tagInput, setTagInput] = useState("");

  // Keep local state in sync when record changes
  useEffect(() => {
    setNotes(record.notes);
  }, [record.id, record.notes]);

  const handleNotesBlur = () => {
    if (notes !== record.notes) onUpdate({ notes });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !record.tags.includes(tag)) {
      onUpdate({ tags: [...record.tags, tag] });
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    onUpdate({ tags: record.tags.filter((t) => t !== tag) });
  };

  const fields = [
    { label: "Email", value: record.email },
    { label: "Company", value: record.company },
    { label: "Title", value: record.title },
    { label: "City", value: record.city },
    { label: "Country", value: record.country },
    { label: "Source", value: record.source },
  ];

  const content = (
    <div className="flex-1 overflow-auto p-4 space-y-5 pb-10 sm:pb-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{f.label}</label>
            <p className="text-sm mt-0.5 truncate text-foreground font-medium">{f.value || "—"}</p>
          </div>
        ))}
        {record.custom_fields && Object.entries(record.custom_fields).map(([key, val]) => (
          <div key={key} className="min-w-0">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{key}</label>
            <p className="text-sm mt-0.5 truncate text-foreground font-medium">{val as string || "—"}</p>
          </div>
        ))}
      </div>

      <div className="h-px bg-border my-2" />

      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {record.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-[11px] bg-accent/50 text-accent-foreground border-none px-2 py-0.5">
              {tag}
              <button 
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }} 
                className="hover:text-destructive transition-colors ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {record.tags.length === 0 && <p className="text-xs text-muted-foreground italic">No tags added</p>}
        </div>
        <div className="flex gap-1.5 mt-3">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Add tag..."
            className="h-8 text-xs bg-secondary/30"
          />
          <Button size="sm" variant="outline" onClick={addTag} className="h-8 text-xs px-3 font-medium">
            Add
          </Button>
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-xs mb-2 block">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Type here to add notes..."
          className="mt-1 text-sm min-h-[140px] resize-none bg-secondary/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
        />
        <p className="text-[10px] text-muted-foreground mt-2 italic text-right">Auto-saves on blur</p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={!!record} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b pb-3 pt-2">
            <DrawerTitle className="text-base text-left font-bold">{record.full_name}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-auto no-scrollbar">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="w-80 border-l bg-background animate-slide-in-right flex flex-col shrink-0 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3.5 border-b sticky top-0 bg-background z-10">
        <h3 className="font-bold text-sm truncate">{record.full_name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 hover:bg-secondary">
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {content}
    </div>
  );
}
