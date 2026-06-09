import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyUrlButton({ imageUrl }: { imageUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 font-bold text-sm transition hover:border-primary hover:text-primary"
      onClick={handleCopy}
      type="button"
    >
      <Copy aria-hidden="true" className="size-4" />
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}
