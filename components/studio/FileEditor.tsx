interface FileEditorProps {
  value: string;
  onChange(value: string): void;
}

export function FileEditor({ value, onChange }: FileEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[560px] w-full resize-y rounded border border-zinc-300 bg-white p-4 font-mono text-sm leading-6 text-zinc-950 outline-none focus:border-zinc-950"
      spellCheck={false}
    />
  );
}
