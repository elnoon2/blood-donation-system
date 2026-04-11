import { Link } from "react-router";
import { Droplet, Home, Search } from "lucide-react";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Animation */}
        <div className="relative">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/10 rounded-full p-8 animate-pulse">
              <Droplet className="w-20 h-20 text-primary" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Page Not Found</h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Button size="lg" asChild>
            <Link to="/">
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/search-donors">
              <Search className="w-5 h-5 mr-2" />
              Find Donors
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-12 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">Quick Links:</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/dashboard" className="text-sm text-primary hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/request-blood" className="text-sm text-primary hover:underline">
              Request Blood
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/profile" className="text-sm text-primary hover:underline">
              Profile
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
