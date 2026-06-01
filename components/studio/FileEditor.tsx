interface FileEditorProps {
  value: string;
  onChange(value: string): void;
}

export function FileEditor({ value, onChange }: FileEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[360px] w-full resize-y rounded-3xl bg-[#25231d] p-5 font-mono text-sm leading-7 text-[#f3ead8] outline-none shadow-inner transition focus:ring-4 focus:ring-[#c7ad6d]/30"
      spellCheck={false}
    />
  );
}
