import * as React from "react"
import { Check, X } from "lucide-react"
import { Badge } from "./badge"
import { Command, CommandGroup, CommandItem, CommandList } from "./command"
import { Command as CommandPrimitive } from "cmdk"

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione..."
}: {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = React.useState("")

  const handleUnselect = (item: string) => {
    onChange(selected.filter((s) => s !== item))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          onChange(selected.slice(0, -1))
        }
      }
      if (e.key === "Escape") {
        input.blur()
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const val = input.value.trim();
        if (val !== "" && !selected.some(s => s.toLowerCase() === val.toLowerCase())) {
          onChange([...selected, val]);
          setInputValue("");
        }
      }
    }
  }

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div
        className="group border border-gray-200 px-3 py-2 text-sm rounded-md focus-within:ring-2 focus-within:ring-gray-400 focus-within:ring-offset-2 dark:bg-[#1A1F2E] dark:border-gray-700 min-h-[40px]"
      >
        <div className="flex gap-1 overflow-x-auto pb-1 items-center hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {selected.map((item) => {
            const option = options.find((o) => o.value === item)
            return (
              <Badge key={item} variant="secondary" className="hover:bg-secondary">
                {option?.label || item}
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(item)
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={() => handleUnselect(item)}
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-gray-900 dark:hover:text-white" />
                </button>
              </Badge>
            )
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            placeholder={selected.length === 0 ? placeholder : "Adicionar cobertura..."}
            className="ml-2 bg-transparent outline-none placeholder:text-gray-500 flex-1 min-w-[120px]"
          />
        </div>
      </div>
    </Command>
  )
}
