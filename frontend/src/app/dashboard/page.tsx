'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { StatsCard } from '@/components/StatsCard';
import { LicenseTable } from '@/components/LicenseTable';
import { DashboardNav } from '@/components/DashboardNav';

export default function DashboardPage() {
  const { data: licenses, isLoading } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => apiClient.get('/licenses').then((r) => r.data),
  });

  const stats = [
    {
      label: 'Total Licenses Issued',
      value: licenses?.pagination?.total ?? '—',
      icon: '📄',
    },
    {
      label: 'Active Licenses',
      value:
        licenses?.data?.filter((l: { status: string }) => l.status === 'active').length ?? '—',
      icon: '✅',
    },
    {
      label: 'Products Registered',
      value: '—',
      icon: '📦',
    },
    {
      label: 'API Keys',
      value: '—',
      icon: '🔑',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <StatsCard key={s.label} {...s} />
          ))}
        </div>

        {/* Recent Licenses */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Licenses</h2>
          </div>
          <LicenseTable licenses={licenses?.data ?? []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
