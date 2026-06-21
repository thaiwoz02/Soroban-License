'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardNav } from '@/components/DashboardNav';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiClient.get('/analytics/overview').then((r) => r.data),
  });

  const { data: usage } = useQuery({
    queryKey: ['analytics-usage'],
    queryFn: () => apiClient.get('/analytics/usage').then((r) => r.data),
  });

  const { data: events } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: () => apiClient.get('/analytics/events').then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Analytics</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Issued', value: overview?.licenses?.total ?? '—' },
            { label: 'Active', value: overview?.licenses?.active ?? '—' },
            { label: 'Revoked', value: overview?.licenses?.revoked ?? '—' },
            { label: 'API Keys', value: overview?.apiKeys?.total ?? '—' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Issuance chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Licenses Issued — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={usage?.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
                formatter={(v: number) => [v, 'Licenses']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent events */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Recent Events</h2>
          </div>
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['Event', 'License ID', 'Actor', 'Time'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(events?.data ?? []).map((e: {
                id: string;
                event_type: string;
                on_chain_license_id: string;
                actor_address: string;
                occurred_at: string;
              }) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-700 capitalize">{e.event_type}</td>
                  <td className="px-6 py-3 text-sm font-mono text-slate-500">
                    {e.on_chain_license_id?.slice(0, 10)}…
                  </td>
                  <td className="px-6 py-3 text-sm font-mono text-slate-500">
                    {e.actor_address?.slice(0, 10)}…
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    {new Date(e.occurred_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
