import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  alt: string;
  imageUrl: string;
  onClose: () => void;
}

export function ImageLightbox({ alt, imageUrl, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      aria-label="Full screen image viewer"
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/95 p-4 backdrop-blur-xl"
      role="dialog"
    >
      <button
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        type="button"
      >
        <span className="sr-only">Close image viewer backdrop</span>
      </button>
      <button
        className="absolute top-5 right-5 z-10 grid size-11 place-items-center rounded-full border border-border bg-black/80 text-foreground transition hover:border-primary hover:text-primary"
        onClick={onClose}
        type="button"
      >
        <span className="sr-only">Close image viewer</span>
        <X aria-hidden="true" className="size-5" />
      </button>
      <img
        alt={alt}
        className="relative z-10 max-h-[92svh] max-w-[94vw] object-contain shadow-[0_40px_160px_rgba(0,0,0,0.8)]"
        height={1536}
        src={imageUrl}
        width={1536}
      />
    </div>,
    document.body
  );
}
