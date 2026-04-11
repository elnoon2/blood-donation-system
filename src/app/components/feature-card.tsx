import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: boolean;
}

export function FeatureCard({ icon: Icon, title, description, gradient = false }: FeatureCardProps) {
  return (
    <Card 
      className={`p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
        gradient ? "bg-gradient-to-br from-white to-primary/5" : ""
      }`}
    >
      <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  );
}
