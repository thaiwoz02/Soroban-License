'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { clsx } from 'clsx';

interface VerifyResult {
  valid: boolean;
  reason?: string;
  license?: {
    id: string;
    onChainId: string;
    status: string;
    licenseType: string;
    accessLevel: string;
    holderAddress: string;
    issuerAddress: string;
    issuedAt: number;
    expiresAt: number;
  };
}

export default function VerifyPage() {
  const [licenseId, setLicenseId] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!licenseId.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await apiClient.get<VerifyResult>(`/verify/${licenseId.trim()}`);
      setResult(data);
    } catch {
      setError('Verification request failed. Check the license ID and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">
          Verify a License
        </h1>
        <p className="text-slate-500 text-center mb-8">
          Enter a license ID or on-chain hash to verify its validity.
        </p>

        <form onSubmit={handleVerify} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            License ID
          </label>
          <input
            type="text"
            value={licenseId}
            onChange={(e) => setLicenseId(e.target.value)}
            placeholder="UUID or on-chain hex ID"
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            aria-label="License ID"
          />
          <button
            type="submit"
            disabled={loading || !licenseId.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 font-semibold transition-colors"
          >
            {loading ? 'Verifying…' : 'Verify License'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div
            className={clsx(
              'mt-4 rounded-xl border p-6',
              result.valid
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{result.valid ? '✅' : '❌'}</span>
              <span
                className={clsx(
                  'text-lg font-semibold',
                  result.valid ? 'text-green-800' : 'text-red-800'
                )}
              >
                {result.valid ? 'Valid License' : 'Invalid License'}
              </span>
            </div>

            {!result.valid && result.reason && (
              <p className="text-red-700 text-sm">{result.reason}</p>
            )}

            {result.valid && result.license && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Status', result.license.status],
                  ['Type', result.license.licenseType],
                  ['Access Level', result.license.accessLevel],
                  [
                    'Issued',
                    new Date(result.license.issuedAt * 1000).toLocaleDateString(),
                  ],
                  [
                    'Expires',
                    result.license.expiresAt === 0
                      ? 'Never'
                      : new Date(result.license.expiresAt * 1000).toLocaleDateString(),
                  ],
                  ['Holder', `${result.license.holderAddress.slice(0, 8)}…`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-slate-500 text-xs">{k}</dt>
                    <dd className="font-medium text-slate-800 capitalize">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
