import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Droplet, Phone, Mail, Calendar, Award, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { GOVERNORATES, BLOOD_TYPES } from "../../lib/location-data";

export function DonorProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    bloodType: user?.bloodType || "O+",
    governorate: "Cairo",
    lastDonation: "",
  });
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchDonorDetails = async () => {
      try {
        const response = await api.get("/auth/me");
        if (response.data) {
          const u = response.data;
          setFormData(prev => ({
            ...prev,
            name: u.name,
            email: u.email,
            phone: u.phone || "",
            bloodType: u.bloodType || "O+",
            governorate: u.governorate || "Cairo",
          }));
        }
        
        try {
          // Fetch donor specific availability
          const donorResponse = await api.get("/donors/me");
          if (donorResponse.data) {
              setIsAvailable(donorResponse.data.availabilityStatus === "AVAILABLE");
              setFormData(prev => ({
                  ...prev,
                  lastDonation: donorResponse.data.lastDonationDate || "",
              }));
          }
          // Fetch donor stats
          const statsResponse = await api.get("/donors/stats");
          setStats(statsResponse.data);
  
          // Fetch donation history
          const historyResponse = await api.get("/donations/me");
          setHistory(historyResponse.data || []);
        } catch (donorErr) {
          console.log("User is not registered as a donor yet or donor data is missing.");
          setStats({
            totalDonations: 0,
            livesSaved: 0,
            daysUntilEligible: 0,
            impactScore: 0,
            nextEligibleDate: "Available Now"
          });
        }

      } catch (error) {
        console.error("Failed to fetch user details", error);
      }
    };
    fetchDonorDetails();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone || !formData.governorate) {
        toast.error("Please fill in all required fields.");
        return;
    }

    setLoading(true);
    try {
      await api.put("/donors/me", {
        governorate: formData.governorate,
        phone: formData.phone,
        lastDonationDate: formData.lastDonation,
        availabilityStatus: isAvailable ? "AVAILABLE" : "UNAVAILABLE",
      });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update profile", {
        description: error.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  const donationHistory = history.map(d => ({
    date: d.donationDate,
    location: d.hospital?.name || "Hospital",
    type: "Whole Blood"
  }));

  const achievements = [
    { title: "First Donation", icon: "🎉", date: history.length > 0 ? history[0].donationDate : "---", unlocked: history.length >= 1 },
    { title: "5 Donations", icon: "⭐", date: history.length >= 5 ? history[4].donationDate : "---", unlocked: history.length >= 5 },
    { title: "Life Saver", icon: "❤️", date: history.length >= 3 ? "Unlocked" : "---", unlocked: history.length >= 3 },
    { title: "Hero Donor", icon: "🏆", date: history.length >= 10 ? "Unlocked" : "---", unlocked: history.length >= 10 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Profile</h1>
          <p className="text-gray-600">Manage your profile information and donation availability</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                <Badge variant={isAvailable ? "default" : "secondary"}>
                  {isAvailable ? "Available" : "Not Available"}
                </Badge>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <select
                        id="bloodType"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.bloodType}
                        disabled
                    >
                        {BLOOD_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                        id="phone"
                        className="pl-9"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="governorate">Governorate</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            id="governorate"
                            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <div className="space-y-2">
                    <Label htmlFor="lastDonation">Last Donation Date</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                        id="lastDonation"
                        type="date"
                        className="pl-9"
                        value={formData.lastDonation}
                        onChange={(e) => setFormData({ ...formData, lastDonation: e.target.value })}
                        />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="availability" className="text-base">Donation Availability</Label>
                    <p className="text-sm text-gray-500">
                      Let others know if you're available to donate
                    </p>
                  </div>
                  <Switch
                    id="availability"
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" className="flex-1 h-11" disabled={loading}>
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                        </div>
                    ) : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => window.location.reload()}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            {/* Donation History */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Donation History</h2>
              <div className="space-y-3">
                {donationHistory.length > 0 ? donationHistory.map((donation, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 rounded-full p-3">
                        <Droplet className="w-5 h-5 text-primary" fill="currentColor" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{donation.location}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">{donation.date}</span>
                          <Badge variant="secondary">{donation.type}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                    <div className="py-12 text-center text-gray-400">
                        <Droplet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No donation history yet.</p>
                    </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-3">
                    <Droplet className="w-6 h-6 text-primary" fill="currentColor" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats?.totalDonations || 0}</div>
                    <div className="text-sm text-gray-500">Total Donations</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-3">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats?.daysUntilEligible || 0}</div>
                    <div className="text-sm text-gray-500">Days Until Eligible</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-3">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats?.impactScore || 0}</div>
                    <div className="text-sm text-gray-500">Impact Score</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Achievements */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Achievements</h2>
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      achievement.unlocked 
                        ? "bg-gradient-to-r from-primary/10 to-transparent" 
                        : "opacity-40 grayscale"
                    }`}
                  >
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                      <p className="text-xs text-gray-500">{achievement.unlocked ? `Unlocked on ${achievement.date}` : "Locked"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Next Donation Reminder */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-center space-y-3">
                <Calendar className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-semibold text-gray-900">Next Donation Eligible</h3>
                <p className="text-2xl font-bold text-primary">{stats?.nextEligibleDate || "Available Now"}</p>
                <p className="text-sm text-gray-600">{stats?.daysUntilEligible > 0 ? `${stats.daysUntilEligible} days remaining` : "You are ready to donate!"}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
