import { useMutation } from "convex/react";
import { type ComponentProps, useState } from "react";
import { api } from "../../convex/_generated/api";

const sizes = ["1024x1024", "1024x1536", "1536x1024"] as const;
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
    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
      <label className="grid gap-2 font-medium text-sm" htmlFor="prompt">
        Prompt
        <textarea
          className="min-h-36 rounded-2xl border bg-background p-4 font-normal text-base outline-none transition focus:ring-2 focus:ring-ring"
          id="prompt"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the image direction, mood, subject, and use case..."
          required
          value={prompt}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-4">
        <label className="grid gap-2 font-medium text-sm" htmlFor="count">
          Count
          <input
            className="rounded-xl border bg-background px-3 py-2 font-normal"
            id="count"
            max={4}
            min={1}
            onChange={(event) => setCount(Number(event.target.value))}
            type="number"
            value={count}
          />
        </label>
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
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <button
        className="rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Starting..." : "Create with Ember"}
      </button>
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
    <label className="grid gap-2 font-medium text-sm" htmlFor={id}>
      {label}
      <select
        className="rounded-xl border bg-background px-3 py-2 font-normal"
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
