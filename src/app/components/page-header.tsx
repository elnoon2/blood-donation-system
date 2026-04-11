import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  gradient?: boolean;
}

export function PageHeader({ title, description, icon: Icon, gradient = false }: PageHeaderProps) {
  return (
    <div className={`py-12 px-4 sm:px-6 lg:px-8 ${gradient ? 'bg-gradient-to-br from-primary/5 via-white to-primary/5' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          {Icon && (
            <div className="bg-primary/10 rounded-lg p-3">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h1>
            <p className="text-lg text-gray-600 mt-2">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
