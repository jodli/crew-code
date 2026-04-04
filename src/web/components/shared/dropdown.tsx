import { cloneElement, isValidElement, type ReactElement, useEffect, useRef, useState } from "react";

interface DropdownItem {
  label: string;
  icon?: string;
  danger?: boolean;
  onSelect: () => void;
}

export function Dropdown({
  trigger,
  items,
}: {
  trigger: ReactElement<{ onClick?: React.MouseEventHandler }>;
  items: DropdownItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const triggerWithClick = isValidElement(trigger) ? cloneElement(trigger, { onClick: () => setOpen(!open) }) : trigger;

  return (
    <div className="relative" ref={ref}>
      {triggerWithClick}
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-bg-surface border border-border rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.3)] py-1 z-50">
          {items.map((item) => (
            <button
              type="button"
              key={item.label}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                item.danger
                  ? "text-error/70 hover:text-error hover:bg-error/5"
                  : "text-text-secondary hover:text-text hover:bg-bg-hover"
              }`}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
