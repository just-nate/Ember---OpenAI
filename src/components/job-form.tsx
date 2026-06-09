import { useMutation } from "convex/react";
import { ImagePlus, SlidersHorizontal, Sparkles } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { api } from "../../convex/_generated/api";

const sizes = [
  "auto",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "2048x2048",
  "2048x1152",
  "2560x1440",
  "1440x2560",
  "3840x2160",
  "2160x3840",
] as const;
const qualities = ["auto", "low", "medium", "high"] as const;
const formats = ["png", "jpeg", "webp"] as const;
type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

export function JobForm() {
  const createJob = useMutation(api.jobs.create);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [size, setSize] = useState<(typeof sizes)[number]>("1024x1024");
  const [quality, setQuality] = useState<(typeof qualities)[number]>("auto");
  const [format, setFormat] = useState<(typeof formats)[number]>("png");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = prompt.length;

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 3) {
      setError("Prompt must be at least 3 characters.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createJob({ count, format, prompt: trimmedPrompt, quality, size });
      setPrompt("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Job creation failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
      <div className="ember-panel overflow-hidden rounded-sm">
        <div className="border-border border-b px-5 py-4">
          <label className="ember-kicker" htmlFor="prompt">
            Prompt
          </label>
        </div>
        <div className="relative">
          <textarea
            aria-describedby="prompt-count"
            className="min-h-64 w-full resize-y bg-black/80 px-5 py-6 text-lg leading-8 outline-none transition placeholder:text-muted-foreground focus:bg-black/90 md:min-h-80 lg:min-h-[24rem]"
            id="prompt"
            maxLength={4000}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the image you want to generate in detail..."
            required
            value={prompt}
          />
          <p
            className="absolute right-5 bottom-4 text-muted-foreground text-xs"
            id="prompt-count"
          >
            {characterCount.toLocaleString()}/4,000
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-border border-y py-4 sm:grid-cols-[0.8fr_1fr_1fr_1fr]">
        <fieldset className="grid gap-2">
          <legend className="ember-kicker mb-2">Count</legend>
          <div className="grid grid-cols-3 overflow-hidden rounded-sm border border-border bg-black/70">
            {[1, 2, 4].map((option) => (
              <button
                aria-pressed={count === option}
                className={`px-3 py-2 font-bold text-sm transition ${
                  count === option
                    ? "bg-white/18 text-foreground"
                    : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                }`}
                key={option}
                onClick={() => setCount(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <SelectField
          id="size"
          label="Size"
          onChange={(value) => setSize(value as typeof size)}
          options={sizes}
          value={size}
        />
        <SelectField
          id="quality"
          label="Quality"
          onChange={(value) => setQuality(value as typeof quality)}
          options={qualities}
          value={quality}
        />
        <SelectField
          id="format"
          label="Format"
          onChange={(value) => setFormat(value as typeof format)}
          options={formats}
          value={format}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/8 px-3 py-2 font-bold text-sm">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Default Style
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-2 text-muted-foreground text-sm">
            <ImagePlus aria-hidden="true" className="size-4" />
            R2 storage
          </span>
        </div>
        <button
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-sm bg-white px-6 py-3 font-black text-black transition duration-300 hover:scale-[1.02] hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          <Sparkles aria-hidden="true" className="size-5" />
          {isSubmitting ? "Starting" : "Create"}
        </button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </form>
  );
}

function SelectField({
  id,
  label,
  onChange,
  options,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="ember-kicker">{label}</span>
      <select
        className="ember-field h-10 rounded-sm px-3 font-bold text-sm uppercase tracking-[0.06em]"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
