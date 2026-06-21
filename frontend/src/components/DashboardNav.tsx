import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/licenses', label: 'Licenses' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/api-keys', label: 'API Keys' },
  { href: '/dashboard/analytics', label: 'Analytics' },
];

export function DashboardNav() {
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-slate-900 text-lg">
              Soroban License
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Verify
            </Link>
            <button
              type="button"
              className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
