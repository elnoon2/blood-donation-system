import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { DonorCard } from "../components/donor-card";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Search, Filter, MapPin } from "lucide-react";
import api from "../../lib/api";
import { useState, useEffect } from "react";
import { GOVERNORATES, BLOOD_TYPES } from "../../lib/location-data";
import { useAuth } from "../context/AuthContext";

export function SearchDonorsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    bloodType: "all",
    governorate: "all",
    searchTerm: "",
    nearbyOnly: false,
    availableOnly: false,
  });
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.bloodType && filters.bloodType !== "all") params.append("bloodType", filters.bloodType);
      if (filters.governorate && filters.governorate !== "all") params.append("governorate", filters.governorate);
      
      const response = await api.get(`/donors/search?${params.toString()}`);
      setDonors(response.data);
    } catch (error) {
      console.error("Failed to fetch donors", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDonors();
    }, 500); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [filters.bloodType, filters.governorate]);

  const getMatchingScore = (donor: any) => {
    let score = 0;
    if (donor?.availabilityStatus === "AVAILABLE") score += 40;
    if (user?.bloodType && donor?.user?.bloodType === user.bloodType) score += 35;
    if (user?.governorate && donor?.user?.governorate === user.governorate) score += 25;
    return Math.min(score, 100);
  };

  const filteredDonors = donors
    .filter((donor) => {
      const matchesSearch =
        !filters.searchTerm ||
        donor.user.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchesNearby = !filters.nearbyOnly || donor?.user?.governorate === user?.governorate;
      const matchesAvailable = !filters.availableOnly || donor?.availabilityStatus === "AVAILABLE";
      return matchesSearch && matchesNearby && matchesAvailable;
    })
    .sort((a, b) => getMatchingScore(b) - getMatchingScore(a));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Blood Donors</h1>
          <p className="text-gray-600">Search for available donors in your area by blood type and location</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
              </div>

              <div className="space-y-6">
                {/* Search by Name */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search by Name</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Donor name..."
                      className="pl-10"
                      value={filters.searchTerm}
                      onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    />
                  </div>
                </div>

                {/* Blood Type Filter */}
                <div className="space-y-2">
                  <Label htmlFor="bloodType">Blood Type</Label>
                  <select
                    id="bloodType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={filters.bloodType}
                    onChange={(e) => setFilters({ ...filters, bloodType: e.target.value })}
                  >
                    <option value="all">All blood types</option>
                    {BLOOD_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Governorate Filter */}
                <div className="space-y-2">
                  <Label htmlFor="governorate">Governorate</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        id="governorate"
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.governorate}
                        onChange={(e) => setFilters({ ...filters, governorate: e.target.value })}
                    >
                        <option value="all">All Governorates</option>
                        {GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov}>{gov}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setFilters({
                      bloodType: "all",
                      governorate: "all",
                      searchTerm: "",
                      nearbyOnly: false,
                      availableOnly: false,
                    })
                  }
                >
                  Reset Filters
                </Button>

                {/* Smart Toggles */}
                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    variant={filters.nearbyOnly ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setFilters({ ...filters, nearbyOnly: !filters.nearbyOnly })}
                  >
                    Nearby Only ({user?.governorate || "Your Region"})
                  </Button>
                  <Button
                    type="button"
                    variant={filters.availableOnly ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setFilters({ ...filters, availableOnly: !filters.availableOnly })}
                  >
                    Available Now Only
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Donors</span>
                    <span className="font-semibold text-gray-900">{donors.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available Now</span>
                    <span className="font-semibold text-green-600">
                      {donors.filter(d => d.availabilityStatus).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Filtered Results</span>
                    <span className="font-semibold text-primary">{filteredDonors.length}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Donors Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredDonors.length}</span> donors
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select 
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    defaultValue="recent"
                >
                  <option value="recent">Most Recent</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="bloodType">Blood Type</option>
                  <option value="location">Location</option>
                </select>
              </div>
            </div>

            {filteredDonors.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">No donors found</h3>
                  <p className="text-gray-600">
                    Try adjusting your filters to find more donors in your area
                  </p>
                  <Button
                    onClick={() =>
                      setFilters({
                        bloodType: "all",
                        governorate: "all",
                        searchTerm: "",
                        nearbyOnly: false,
                        availableOnly: false,
                      })
                    }
                  >
                    Clear Filters
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredDonors.map((donor, index) => (
                  <DonorCard
                    key={index}
                    name={donor.user.name}
                    bloodType={donor.user.bloodType}
                    governorate={donor.user.governorate}
                    phone={donor.user.phone}
                    lastDonation={donor.lastDonationDate || "No recent donations"}
                    isAvailable={donor.availabilityStatus === "AVAILABLE"}
                    matchingScore={getMatchingScore(donor)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
