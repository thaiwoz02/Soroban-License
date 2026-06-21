interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xl" role="img" aria-hidden>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
