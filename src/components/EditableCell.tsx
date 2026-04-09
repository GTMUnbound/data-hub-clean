import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface EditableCellProps {
  value: string;
  onUpdate: (newValue: string) => void;
  placeholder?: string;
}

export function EditableCell({ value, onUpdate, placeholder }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalValue(value || "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (internalValue !== (value || "")) {
      onUpdate(internalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setInternalValue(value || "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-7 px-2 py-1 text-sm border-primary/50 focus-visible:ring-1 focus-visible:ring-primary w-full min-w-[80px]"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      className="px-2 py-1 min-h-[28px] w-full cursor-text hover:bg-black/5 hover:dark:bg-white/5 rounded transition-colors flex items-center group relative overflow-hidden text-ellipsis whitespace-nowrap"
      onClick={() => setIsEditing(true)}
      title={value || ""}
    >
      <span className={!value ? "text-muted-foreground/50 italic text-xs" : ""}>
        {value || (placeholder ? `Add ${placeholder}...` : "—")}
      </span>
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
