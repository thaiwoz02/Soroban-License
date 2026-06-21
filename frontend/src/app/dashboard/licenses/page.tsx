'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardNav } from '@/components/DashboardNav';
import { LicenseTable } from '@/components/LicenseTable';

export default function LicensesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState<'holder' | 'issuer'>('issuer');

  const { data, isLoading } = useQuery({
    queryKey: ['licenses', role],
    queryFn: () => apiClient.get(`/licenses?role=${role}`).then((r) => r.data),
  });

  const issueMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiClient.post('/licenses', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licenses'] });
      setShowForm(false);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    issueMutation.mutate({
      holderAddress: fd.get('holderAddress'),
      productId: fd.get('productId'),
      licenseType: fd.get('licenseType'),
      accessLevel: fd.get('accessLevel'),
      expiresAt: Number(fd.get('expiresAt') || 0),
      maxActivations: Number(fd.get('maxActivations') || 0),
      transferable: fd.get('transferable') === 'true',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Licenses</h1>
          <div className="flex items-center gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'holder' | 'issuer')}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              aria-label="Filter by role"
            >
              <option value="issuer">As Issuer</option>
              <option value="holder">As Holder</option>
            </select>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              {showForm ? 'Cancel' : '+ Issue License'}
            </button>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-slate-200 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <h2 className="col-span-full text-lg font-semibold text-slate-800">Issue New License</h2>

            {[
              { name: 'holderAddress', label: 'Holder Stellar Address', placeholder: 'GABC...' },
              { name: 'productId', label: 'Product ID (UUID)', placeholder: 'uuid' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input
                  name={f.name}
                  required
                  placeholder={f.placeholder}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">License Type</label>
              <select name="licenseType" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="perpetual">Perpetual</option>
                <option value="subscription">Subscription</option>
                <option value="metered">Metered</option>
                <option value="tiered">Tiered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Access Level</label>
              <select name="accessLevel" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expiry (Unix timestamp, 0 = never)
              </label>
              <input
                name="expiresAt"
                type="number"
                defaultValue={0}
                min={0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Activations (0 = unlimited)
              </label>
              <input
                name="maxActivations"
                type="number"
                defaultValue={0}
                min={0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transferable</label>
              <select name="transferable" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            <div className="col-span-full flex justify-end gap-3">
              {issueMutation.isError && (
                <p className="text-red-600 text-sm self-center">Failed to issue license.</p>
              )}
              <button
                type="submit"
                disabled={issueMutation.isPending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors"
              >
                {issueMutation.isPending ? 'Issuing…' : 'Issue License'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <LicenseTable licenses={data?.data ?? []} isLoading={isLoading} />
        </div>

        {data?.pagination && (
          <p className="mt-3 text-sm text-slate-500 text-right">
            Showing {data.data?.length} of {data.pagination.total} licenses
          </p>
        )}
      </div>
    </div>
  );
}
