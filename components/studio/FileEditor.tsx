interface FileEditorProps {
  value: string;
  onChange(value: string): void;
}

export function FileEditor({ value, onChange }: FileEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[360px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-50 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
      spellCheck={false}
    />
  );
}
