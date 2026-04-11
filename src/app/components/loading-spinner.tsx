import { Droplet } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Droplet className="w-6 h-6 text-primary animate-pulse" fill="currentColor" />
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Droplet className="w-8 h-8 text-primary animate-pulse" fill="currentColor" />
          </div>
        </div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}
