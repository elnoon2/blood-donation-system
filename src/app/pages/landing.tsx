import { Link } from "react-router";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { Button } from "../components/ui/button";
import { StatsCard } from "../components/stats-card";
import { Droplet, Users, Building2, Heart, Shield, Clock, Award, Search, Bell, CheckCircle2, Zap, Globe } from "lucide-react";
import { Card } from "../components/ui/card";
import { useState, useEffect } from "react";
import api from "../../lib/api";

export function LandingPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/public/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch landing stats", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-white to-primary/5 py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-block">
              <div className="flex items-center justify-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6 hover:bg-primary/20 transition-colors">
                <Droplet className="w-5 h-5 text-primary animate-pulse" fill="currentColor" />
                <span className="text-sm font-medium text-primary">Saving Lives Together</span>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Connect Donors.<br />
              <span className="text-primary bg-gradient-to-r from-primary to-red-700 bg-clip-text text-transparent">Save Lives.</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join our smart blood donation network to find donors quickly, request blood in emergencies,
              and make a difference in your community.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 py-6 hover:scale-105 transition-transform" asChild>
                <Link to="/register">
                  <Droplet className="w-5 h-5 mr-2" fill="currentColor" />
                  Donate Now
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 hover:scale-105 transition-transform" asChild>
                <Link to="/request-blood">
                  <Heart className="w-5 h-5 mr-2" />
                  Request Blood
                </Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Verified Donors</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span>Instant Matching</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>24/7 Available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="Active Donors"
              value={stats?.totalDonors?.toLocaleString() || "..."}
              icon={Users}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard
              title="Partner Hospitals"
              value={stats?.totalHospitals?.toLocaleString() || "..."}
              icon={Building2}
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title="Lives Saved"
              value={stats?.totalLivesSaved?.toLocaleString() || "..."}
              icon={Heart}
              trend={{ value: 23, isPositive: true }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We make blood donation simple, safe, and efficient with cutting-edge technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick Search</h3>
              <p className="text-gray-600">
                Find compatible donors in your area instantly with advanced filtering options
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Alerts</h3>
              <p className="text-gray-600">
                Get instant notifications for urgent blood requests in your area
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Donors</h3>
              <p className="text-gray-600">
                All donors are verified to ensure safety and reliability
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Availability</h3>
              <p className="text-gray-600">
                Access the platform anytime, anywhere, for emergency blood requests
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Donation Tracking</h3>
              <p className="text-gray-600">
                Keep track of your donation history and earn achievement badges
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Network</h3>
              <p className="text-gray-600">
                Join a supportive community of donors committed to saving lives
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join thousands of donors who are already saving lives in their communities
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <Link to="/register">Get Started Today</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 text-white border-white hover:bg-white hover:text-primary" asChild>
              <Link to="/search-donors">Find Donors Now</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}