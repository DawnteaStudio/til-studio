interface FileEditorProps {
  value: string;
  onChange(value: string): void;
}

export function FileEditor({ value, onChange }: FileEditorProps) {
  return (
    <textarea
      aria-label="Markdown source"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="studio-field min-h-[360px] w-full resize-y rounded-3xl bg-[#080b12] p-5 font-mono text-sm leading-7 text-[#f3ead8] outline-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition focus:ring-4 focus:ring-[#5de7ff]/25"
      spellCheck={false}
    />
  );
}
