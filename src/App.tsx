// biome-ignore-all lint/style/useFilenamingConvention: App.tsx remains as a small compatibility entry component.
export function App() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16">
        <p className="font-medium text-muted-foreground text-sm uppercase tracking-[0.24em]">
          Ember
        </p>
        <h1 className="font-semibold text-4xl tracking-tight">
          Ember image creation studio
        </h1>
        <p className="text-muted-foreground">
          Ember keeps the creation flow focused, polished, and easy to run.
        </p>
      </section>
    </main>
  );
}

export default App;
