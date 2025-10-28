import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center">
      <div className="container grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Sparta Cells</h1>
          <p className="text-fg-muted text-lg">
            A premium, fast and accessible way to compare smartphone specifications with
            professional design and effortless filters.
          </p>
          <div className="flex gap-3">
            <Link
              href="/compare"
              className="inline-flex items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-fg))] px-5 py-3 font-medium shadow-md hover:opacity-95"
            >
              Open Comparison
            </Link>
            <a
              href="#learn-more"
              className="inline-flex items-center rounded-xl border border-[hsl(var(--border))] px-5 py-3 font-medium"
            >
              Learn more
            </a>
          </div>
        </div>
        <div className="card p-6">
          <div className="aspect-[16/10] w-full rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-300/10" />
        </div>
      </div>
    </main>
  );
}
