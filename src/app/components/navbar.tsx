import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router";
import { Droplet, Menu, User, X, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const normalizedRole = user?.role?.toUpperCase().replace("ROLE_", "") || "";
  const isPatient = normalizedRole === "PATIENT";
  const isDonor = normalizedRole === "DONOR";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-primary rounded-lg p-2">
              <Droplet className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Smart Blood Donation</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isPatient && (
              <>
                <Link to="/search-donors" className="text-gray-700 hover:text-primary transition-colors">
                  Find Donors
                </Link>
                <Link to="/request-blood" className="text-gray-700 hover:text-primary transition-colors">
                  Request Blood
                </Link>
              </>
            )}
            <Link to="/contact-us" className="text-gray-700 hover:text-primary transition-colors">
              Contact
            </Link>
            <Link to="/dashboard" className="text-gray-700 hover:text-primary transition-colors">
              Dashboard
            </Link>
            <div className="flex items-center gap-3 ml-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  {user?.role === "ROLE_ADMIN" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/admin">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors">
                    <div className="bg-primary/10 rounded-full p-2">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{user?.name}</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="w-5 h-5 text-gray-500" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              {isPatient && (
                <>
                  <Link
                    to="/search-donors"
                    className="text-gray-700 hover:text-primary transition-colors px-2 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Find Donors
                  </Link>
                  <Link
                    to="/request-blood"
                    className="text-gray-700 hover:text-primary transition-colors px-2 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Request Blood
                  </Link>
                </>
              )}
              <Link
                to="/contact-us"
                className="text-gray-700 hover:text-primary transition-colors px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-primary transition-colors px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/profile"
                      className="text-gray-700 hover:text-primary transition-colors px-2 py-2 flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-5 h-5" />
                      Profile Settings
                    </Link>
                    {user?.role === "ROLE_ADMIN" && (
                      <Link
                        to="/admin"
                        className="text-gray-700 hover:text-primary transition-colors px-2 py-2 flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Admin Panel
                      </Link>
                    )}
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        Login
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                        Register
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}