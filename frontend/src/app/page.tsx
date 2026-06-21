import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 text-white px-4">
      <div className="max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
          Built on Stellar · Powered by Soroban
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Soroban License
        </h1>
        <p className="text-xl text-slate-300 mb-8 leading-relaxed">
          Programmable, verifiable, and transferable digital licenses on-chain.
          Issue licenses for software, APIs, and digital content — enforced by
          smart contracts.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-3 font-semibold transition-colors"
          >
            Developer Dashboard
          </Link>
          <Link
            href="/verify"
            className="rounded-lg border border-slate-500 hover:border-slate-300 px-6 py-3 font-semibold transition-colors"
          >
            Verify a License
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-6"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
            <p className="text-slate-400 text-sm">{f.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

const features = [
  {
    icon: '🔑',
    title: 'On-Chain License Issuance',
    description:
      'Create unique digital licenses as blockchain assets with defined terms and access levels.',
  },
  {
    icon: '🛡️',
    title: 'Software & API Licensing',
    description:
      'Bind licenses to devices, users, or API keys with rate limiting and usage tracking.',
  },
  {
    icon: '📚',
    title: 'Content & Course Licensing',
    description:
      'Tokenized access to educational content with time-based or lifetime grants.',
  },
  {
    icon: '✅',
    title: 'Instant Verification',
    description:
      'Public on-chain verification endpoints — no trusted third party required.',
  },
  {
    icon: '🔄',
    title: 'Transferable Licenses',
    description:
      'Enable secondary markets for digital rights where applicable.',
  },
  {
    icon: '⚙️',
    title: 'Developer SDK',
    description:
      'Integrate license verification into your app in minutes with our TypeScript SDK.',
  },
];
