import { clsx } from 'clsx';

interface License {
  id: string;
  on_chain_id: string;
  status: string;
  license_type: string;
  access_level: string;
  holder_address: string;
  expires_at: number;
  created_at: string;
}

interface LicenseTableProps {
  licenses: License[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-yellow-100 text-yellow-700',
  revoked: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
  pending_activation: 'bg-blue-100 text-blue-700',
};

export function LicenseTable({ licenses, isLoading }: LicenseTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Loading licenses…
      </div>
    );
  }

  if (licenses.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        No licenses yet. Issue your first license to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {['License ID', 'Type', 'Access Level', 'Holder', 'Expires', 'Status'].map(
              (col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {licenses.map((l) => (
            <tr key={l.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                {l.id.slice(0, 8)}…
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 capitalize">
                {l.license_type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 capitalize">
                {l.access_level}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                {l.holder_address.slice(0, 10)}…
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {l.expires_at === 0
                  ? 'Never'
                  : new Date(l.expires_at * 1000).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={clsx(
                    'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                    statusColors[l.status] ?? 'bg-slate-100 text-slate-600'
                  )}
                >
                  {l.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
