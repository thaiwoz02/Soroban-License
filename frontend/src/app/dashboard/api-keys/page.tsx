'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardNav } from '@/components/DashboardNav';

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiClient.get('/api-keys').then((r) => r.data),
  });

  const issueMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiClient.post('/api-keys', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(res.data.rawKey);
      setShowForm(false);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api-keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    issueMutation.mutate({
      licenseId: fd.get('licenseId'),
      apiId: fd.get('apiId'),
      rpmLimit: Number(fd.get('rpmLimit') || 60),
      rpdLimit: Number(fd.get('rpdLimit') || 10000),
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <button
            onClick={() => { setShowForm(!showForm); setNewKey(null); }}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            {showForm ? 'Cancel' : '+ New API Key'}
          </button>
        </div>

        {/* One-time key reveal */}
        {newKey && (
          <div className="mb-6 bg-green-50 border border-green-300 rounded-xl p-5">
            <p className="text-green-800 font-semibold mb-1">✅ API Key Created — copy it now</p>
            <p className="text-xs text-green-700 mb-3">This key will not be shown again.</p>
            <code className="block bg-white border border-green-200 rounded-lg px-4 py-3 text-sm font-mono break-all">
              {newKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newKey)}
              className="mt-3 text-sm text-green-700 underline"
            >
              Copy to clipboard
            </button>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-slate-200 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <h2 className="col-span-full text-lg font-semibold text-slate-800">Issue API Key</h2>
            {[
              { name: 'licenseId', label: 'License ID (UUID)', placeholder: 'uuid' },
              { name: 'apiId', label: 'API Identifier', placeholder: 'my-api-v1' },
              { name: 'rpmLimit', label: 'Rate Limit (req/min)', placeholder: '60', type: 'number' },
              { name: 'rpdLimit', label: 'Rate Limit (req/day)', placeholder: '10000', type: 'number' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input
                  name={f.name}
                  type={f.type ?? 'text'}
                  required
                  placeholder={f.placeholder}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="col-span-full flex justify-end">
              <button
                type="submit"
                disabled={issueMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-6 py-2 text-sm font-semibold"
              >
                {issueMutation.isPending ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <p className="p-8 text-center text-slate-400 text-sm">Loading…</p>
          ) : (data?.data ?? []).length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">No API keys yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {['Prefix', 'API ID', 'Rate Limit (rpm)', 'Requests', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.data ?? []).map((k: {
                  id: string;
                  key_prefix: string;
                  api_id: string;
                  rpm_limit: number;
                  total_requests: number;
                  is_active: boolean;
                }) => (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-mono text-slate-700">{k.key_prefix}…</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{k.api_id}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{k.rpm_limit}</td>
                    <td className="px-6 py-3 text-sm text-slate-700">{k.total_requests}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {k.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {k.is_active && (
                        <button
                          onClick={() => revokeMutation.mutate(k.id)}
                          disabled={revokeMutation.isPending}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
