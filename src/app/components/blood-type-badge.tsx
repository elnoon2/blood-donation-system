import { Droplet } from "lucide-react";

interface BloodTypeBadgeProps {
  bloodType: string;
  size?: "sm" | "md" | "lg";
}

export function BloodTypeBadge({ bloodType, size = "md" }: BloodTypeBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-4 py-3 text-lg",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className={`bg-primary text-white rounded-lg font-bold inline-flex items-center gap-2 ${sizeClasses[size]}`}>
      <Droplet className={iconSizes[size]} fill="currentColor" />
      <span>{bloodType}</span>
    </div>
  );
}
