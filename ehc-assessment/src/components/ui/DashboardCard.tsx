interface DashboardCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  badge?: number;
  accentColor?: string;
}

export function DashboardCard({ title, subtitle, icon, onClick, badge, accentColor = '#8a6212' }: DashboardCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-3 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600 transition-all text-center group min-h-[160px]"
    >
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute top-3 right-3 px-2 py-0.5 text-xs font-bold text-white rounded-full"
          style={{ backgroundColor: accentColor }}
        >
          {badge}
        </span>
      )}
      <span className="text-3xl sm:text-4xl" role="img" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3
          className="text-lg font-semibold group-hover:opacity-90 transition-opacity text-[#1a3a4a] dark:text-slate-100"
        >
          {title}
        </h3>

        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>
      </div>
    </button>
  );
}
