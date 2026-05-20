import Link from 'next/link';

const cards = [
  {
    href: '/request-service',
    title: 'Public Lead Form',
    description: 'Create leads and allocate three providers atomically.'
  },
  {
    href: '/dashboard',
    title: 'Provider Dashboard',
    description: 'Review quotas, allocations, and live updates.'
  },
  {
    href: '/test-tools',
    title: 'Test Tools',
    description: 'Simulate webhook retries and concurrent submissions.'
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
      <div className="max-w-3xl space-y-6">
        <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Lead Distribution System</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Deterministic lead routing with database-backed fairness.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          A simplified but production-minded Next.js app for lead intake, mandatory provider assignment,
          monthly quota enforcement, webhook idempotency, and live dashboard updates.
        </p>
      </div>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-white/8"
          >
            <h2 className="text-lg font-medium text-white">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
