import { Link, useNavigate } from "react-router";
import { Droplet, Mail, Lock, User, UserCircle, Phone, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { useState } from "react";
import api, { API_BASE_URL } from "../../lib/api";
import { toast } from "sonner";
import { GOVERNORATES, BLOOD_TYPES } from "../../lib/location-data";
import axios from "axios";

export function RegisterPage() {
  const navigate = useNavigate();
  const publicApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
  });

  // Log the exact full URL being requested for debugging
  publicApi.interceptors.request.use((config) => {
    console.log("[DEBUG] Full Registration URL Requested:", config.baseURL + "/" + config.url);
    return config;
  });

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    bloodType: "A+",
    governorate: "Cairo",
    phone: "",
    role: "donor",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.governorate) {
        toast.error("Please fill in all required fields.");
        return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await publicApi.post(`${API_BASE_URL}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        bloodType: formData.bloodType,
        governorate: formData.governorate,
        phone: formData.phone,
        role: formData.role.toUpperCase(),
      });
      
      toast.success("Account created successfully!", {
        description: "You can now sign in with your credentials.",
      });
      navigate("/login");
    } catch (error: any) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      let message = "Something went wrong. Please try again.";

      if (!error.response) {
        message = `Cannot reach backend at ${api.defaults.baseURL}. Please start backend and try again.`;
      } else if (responseData?.message && typeof responseData.message === "string") {
        message = responseData.message;
      } else if (responseData?.error && typeof responseData.error === "string") {
        message = `Server Error (${status}): ${responseData.error}`;
      } else if (responseData && typeof responseData === "object") {
        // Validation errors can come as { field: message }
        // filter out 'timestamp', 'path', 'status' which are Spring Boot default error fields
        const firstValidationMessage = Object.entries(responseData)
            .filter(([k]) => !['timestamp', 'path', 'status', 'error'].includes(k))
            .map(([, v]) => v)
            .find((v) => typeof v === "string") as string | undefined;
            
        if (firstValidationMessage) message = firstValidationMessage;
        else message = JSON.stringify(responseData);
      } else if (status) {
        message = `Registration request failed (${status}).`;
      }

      toast.error("Registration failed", {
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
        <div className="hidden lg:flex flex-col items-center justify-center p-12">
          {/* ... existing illustration code ... */}
          <div className="text-center space-y-6">
            <div className="bg-primary/10 w-32 h-32 rounded-full flex items-center justify-center mx-auto">
              <Droplet className="w-16 h-16 text-primary" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Join Our Community</h2>
            <p className="text-lg text-gray-600">
              Become a hero by donating blood and saving lives in your community
            </p>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <Card className="p-8 sm:p-12 shadow-xl">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
              <div className="bg-primary rounded-lg p-2">
                <Droplet className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Smart Blood Donation</span>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join us in saving lives through blood donation</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    />
                </div>
                </div>

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    />
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                    id="phone"
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    />
                </div>
                </div>

                <div className="space-y-2">
                <Label htmlFor="bloodType">Blood Type</Label>
                <select
                    id="bloodType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    required
                >
                    {BLOOD_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="governorate">Governorate</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                    id="governorate"
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.governorate}
                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    required
                >
                    {GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>{gov}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Register as</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <RadioGroupItem value="donor" id="donor" />
                  <Label htmlFor="donor" className="flex-1 cursor-pointer">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Droplet className="w-5 h-5 text-primary" fill="currentColor" />
                      <div className="font-medium">Donor</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <RadioGroupItem value="patient" id="patient" />
                  <Label htmlFor="patient" className="flex-1 cursor-pointer">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <UserCircle className="w-5 h-5 text-primary" />
                      <div className="font-medium">Patient</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                </div>
              ) : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
