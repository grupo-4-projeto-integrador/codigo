import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "./calendar";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "DD/MM/AAAA", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal input value with the external date value
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Auto format DD/MM/YYYY
    val = val.replace(/\D/g, ""); // Keep only numbers
    if (val.length > 2) val = val.substring(0, 2) + "/" + val.substring(2);
    if (val.length > 5) val = val.substring(0, 5) + "/" + val.substring(5, 9);
    
    setInputValue(val);

    if (val.length === 10) {
      const parsedDate = parse(val, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate) && parsedDate.getFullYear() > 1900) {
        onChange(parsedDate);
      } else {
        onChange(undefined);
      }
    } else if (val.length === 0) {
      onChange(undefined);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div 
        className={`flex items-center gap-2 w-full h-9 rounded-md border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#0a0a0a] px-3 py-2 text-[13px] text-gray-900 dark:text-white text-left
          focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-colors`}
      >
        <CalendarIcon 
          className="h-4 w-4 shrink-0 opacity-50 cursor-pointer" 
          onClick={() => setOpen((prev) => !prev)}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground w-full"
          maxLength={10}
        />
      </div>

      {open && (
        <div
          className="absolute top-full left-0 z-[9999] mt-1 rounded-md border border-border bg-white dark:bg-[#151515] shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setInputValue(format(date, "dd/MM/yyyy"));
              }
              setOpen(false);
            }}
            initialFocus
            locale={ptBR}
          />
        </div>
      )}
    </div>
  );
}
