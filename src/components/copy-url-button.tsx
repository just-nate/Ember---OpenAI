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
      className="rounded-full border px-3 py-2 text-sm"
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}
