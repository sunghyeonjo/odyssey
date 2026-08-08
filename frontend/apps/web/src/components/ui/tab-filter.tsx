interface TabFilterOption<T extends string> {
  value: T
  label: string
}

interface TabFilterProps<T extends string> {
  options: TabFilterOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function TabFilter<T extends string>({ options, value, onChange }: TabFilterProps<T>) {
  return (
    <div className="flex gap-1" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
