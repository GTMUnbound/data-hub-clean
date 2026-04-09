import { ContactRecord } from "@/types";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RecordPanelProps {
  record: ContactRecord;
  onClose: () => void;
  onUpdate: (updates: Partial<ContactRecord>) => void;
}

export function RecordPanel({ record, onClose, onUpdate }: RecordPanelProps) {
  const [notes, setNotes] = useState(record.notes);
  const [tagInput, setTagInput] = useState("");

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

  return (
    <div className="w-80 border-l bg-background animate-slide-in-right flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm truncate">{record.full_name}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {fields.map((f) => (
          <div key={f.label}>
            <label className="text-xs text-muted-foreground font-medium">{f.label}</label>
            <p className="text-sm mt-0.5">{f.value || "—"}</p>
          </div>
        ))}
        {record.custom_fields && Object.entries(record.custom_fields).map(([key, val]) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground font-medium">{key}</label>
            <p className="text-sm mt-0.5">{val as React.ReactNode || "—"}</p>
          </div>
        ))}

        <div>
          <label className="text-xs text-muted-foreground font-medium">Tags</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {record.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs bg-accent text-accent-foreground">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add tag..."
              className="h-7 text-xs"
            />
            <Button size="sm" variant="outline" onClick={addTag} className="h-7 text-xs px-2">
              Add
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes..."
            className="mt-1.5 text-sm min-h-[100px] resize-none"
          />
        </div>
      </div>
    </div>
  );
}
