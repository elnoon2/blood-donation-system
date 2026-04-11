import { Link, useNavigate } from "react-router";
import { Droplet, Mail, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { API_BASE_URL } from "../../lib/api";
import { toast } from "sonner";
import axios from "axios";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const publicApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
  });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
        toast.error("Please fill in all required fields.");
        return;
    }

    setLoading(true);
    try {
      const response = await publicApi.post(`${API_BASE_URL}/auth/login`, formData);
      const { token } = response.data;
      
      // Fetch the full user object including bloodType, phone, etc
      const meResponse = await publicApi.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fullUserData = meResponse.data;
      
      login(token, fullUserData);
      toast.success("Welcome back!", {
        description: `Logged in as ${fullUserData.name}`,
      });
      
      if (fullUserData.role === "ROLE_ADMIN" || fullUserData.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      const message = !error.response
        ? `Cannot reach backend at ${api.defaults.baseURL}.`
        : error.response?.status === 401
          ? "Invalid email or password."
          : error.response?.data?.message || "Something went wrong. Please try again.";
        
      toast.error("Login failed", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Illustration */}
        <div className="hidden lg:flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="bg-primary/10 w-32 h-32 rounded-full flex items-center justify-center mx-auto">
              <Droplet className="w-16 h-16 text-primary" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back!</h2>
            <p className="text-lg text-gray-600">
              Continue your journey of saving lives through blood donation
            </p>
            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">12K+</div>
                <div className="text-sm text-gray-600">Donors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">156</div>
                <div className="text-sm text-gray-600">Hospitals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">8.7K</div>
                <div className="text-sm text-gray-600">Lives Saved</div>
              </div>
            </div>
        </div>

        {/* Right Side - Login Form */}
        <Card className="p-8 sm:p-12 shadow-xl">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
              <div className="bg-primary rounded-lg p-2">
                <Droplet className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Smart Blood Donation</span>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
            <p className="text-gray-600">Access your account to manage donations</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                </div>
              ) : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
