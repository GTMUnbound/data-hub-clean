import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { X } from "lucide-react";

interface InlineTagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function InlineTagEditor({ tags, onChange }: InlineTagEditorProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" onClick={handleClick}>
      {tags.slice(0, 2).map((tag) => (
        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground gap-0.5">
          {tag}
          {editing && (
            <button onClick={(e) => removeTag(tag, e)}>
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {tags.length > 2 && (
        <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
      )}
      {editing && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") addTag();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => {
            if (input.trim()) addTag();
            setEditing(false);
          }}
          className="w-16 text-xs bg-transparent outline-none border-b border-primary/40"
          placeholder="tag..."
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
