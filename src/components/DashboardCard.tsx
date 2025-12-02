import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
  action: () => void;
}

export function DashboardCard({ icon: Icon, title, description, color, action }: DashboardCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600',
  };

  const borderClasses = {
    blue: 'hover:border-blue-500',
    purple: 'hover:border-purple-500',
    green: 'hover:border-green-500',
    orange: 'hover:border-orange-500',
  };

  return (
    <button
      onClick={action}
      className={`group w-full text-left bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent ${borderClasses[color]} hover:scale-105`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all ${colorClasses[color]}`}>
          <Icon className="w-7 h-7 group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1">
          <h3 className="text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
}
