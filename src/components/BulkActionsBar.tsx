import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, Tag, Download, X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onTag: (tags: string[]) => void;
  onExport: () => void;
  onClear: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onTag, onExport, onClear }: BulkActionsBarProps) {
  const [tagInput, setTagInput] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleAddTag = () => {
    const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      onTag(tags);
      setTagInput("");
      setTagPopoverOpen(false);
    }
  };

  return (
    <div className="border-b bg-accent/30 px-4 sm:px-6 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 animate-fade-in shrink-0">
      <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0 sm:py-0.5 whitespace-nowrap">
        {selectedCount} selected
      </Badge>

      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-7 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3 shrink-0">
              <Tag className="h-3 w-3" />
              <span className="hidden xs:inline">Add Tags</span>
              <span className="xs:hidden">Tag</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 z-50" align="start">
            <p className="text-xs text-muted-foreground mb-2">Comma-separated tags</p>
            <div className="flex gap-1.5">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="e.g. ICP, Warm Lead"
                className="h-8 text-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleAddTag} className="h-8 text-xs px-3">Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-7 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3 shrink-0" onClick={onExport}>
          <Download className="h-3 w-3" />
          Export
        </Button>

        <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-7 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>

      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto shrink-0" onClick={onClear}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
