import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
// Force Vite refresh: 2026-04-10-17-06
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { GOVERNORATES, BLOOD_TYPES } from "../../lib/location-data";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Droplet, Building2, MapPin, Phone, AlertCircle } from "lucide-react";

import api from "../../lib/api";

export function RequestBloodPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [requesterLocation, setRequesterLocation] = useState<{ lat: number; lng: number; mapLink: string } | null>(null);
  const [formData, setFormData] = useState({
    bloodType: "A+",
    units: "1",
    hospital: "",
    governorate: "Cairo",
    phone: "",
    urgency: "medium",
    additionalInfo: "",
  });

  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [availableHospitals, setAvailableHospitals] = useState<any[]>([]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this browser.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latNum = position.coords.latitude;
        const lngNum = position.coords.longitude;
        const lat = latNum.toFixed(6);
        const lng = lngNum.toFixed(6);
        const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        setRequesterLocation({ lat: latNum, lng: lngNum, mapLink: mapsLink });

        setFormData((prev) => {
          const cleanedInfo = prev.additionalInfo
            .replace(/\n?Current location:.*(\n|$)/g, "")
            .trim();
          const locationLine = `Current location: ${lat}, ${lng} (${mapsLink})`;
          return {
            ...prev,
            additionalInfo: cleanedInfo ? `${cleanedInfo}\n${locationLine}` : locationLine,
          };
        });

        setLocationLoading(false);
        toast.success("Current location added to request details.");
      },
      () => {
        setLocationLoading(false);
        toast.error("Could not detect location. Please allow location permission.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Update hospitals when governorate changes
  useEffect(() => {
    const fetchHospitals = async () => {
        setHospitalsLoading(true);
        try {
            console.log(`Fetching hospitals for governorate: ${formData.governorate}`);
            const response = await api.get(`/hospitals?governorate=${formData.governorate}`);
            console.log("Hospitals received:", response.data);
            
            if (response.data && response.data.length > 0) {
                setAvailableHospitals(response.data);
                setFormData(prev => ({ ...prev, hospital: response.data[0].name }));
            } else {
                console.warn("No hospitals found for this governorate, fetching all instead.");
                const allResponse = await api.get("/hospitals");
                setAvailableHospitals(allResponse.data);
                setFormData(prev => ({ ...prev, hospital: "Other / Manual Entry" }));
            }
        } catch (error) {
            console.error("Failed to fetch hospitals", error);
            setAvailableHospitals([]);
        } finally {
            setHospitalsLoading(false);
        }
    };

    fetchHospitals();
  }, [formData.governorate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bloodType || !formData.units || !formData.governorate || !formData.phone) {
        toast.error("Please fill in all required fields.");
        return;
    }

    setLoading(true);
    try {
      await api.post("/requests", {
        bloodType: formData.bloodType,
        quantityNeeded: parseInt(formData.units),
        governorate: formData.governorate,
        phone: formData.phone,
        requesterLatitude: requesterLocation?.lat,
        requesterLongitude: requesterLocation?.lng,
        requesterMapLink: requesterLocation?.mapLink,
        status: "PENDING",
      });
      
      toast.success("Blood request submitted successfully!", {
        description: "Nearby donors have been notified.",
        duration: 4000,
      });
      navigate("/dashboard");
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.response?.data || "Please check your information and try again.";
      
      if (status === 401) {
        toast.error("Session expired", { description: "Please log out and log in again." });
      } else if (status === 403) {
        toast.error("Not authorized (403)", { description: "Your session may have expired. Please log out and log in again." });
      } else {
        toast.error(`Submission failed (${status || 'Network Error'})`, { description: typeof msg === 'string' ? msg : JSON.stringify(msg) });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Blood</h1>
          <p className="text-gray-600">Submit a blood request to find matching donors in your area</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-5 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Blood Type & Units */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Type Required *</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="units">Units Needed *</Label>
                    <Input
                      id="units"
                      type="number"
                      placeholder="e.g., 2"
                      min="1"
                      value={formData.units}
                      onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Hospital */}
                <div className="space-y-2">
                  <Label htmlFor="hospital">Hospital/Medical Facility *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="hospital"
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.hospital}
                      onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                      required
                      disabled={hospitalsLoading}
                    >
                      {hospitalsLoading ? (
                        <option>Loading regional hospitals...</option>
                      ) : availableHospitals.length > 0 ? (
                        availableHospitals.map((h) => (
                          <option key={h.id} value={h.name}>{h.name}</option>
                        ))
                      ) : (
                        <option value="Other">Other / Manual Entry</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Location & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="governorate">Governorate *</Label>
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
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={handleUseCurrentLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading ? "Detecting current location..." : "Use My Current Location"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        placeholder="01xxxxxxxxx"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Urgency Level */}
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level *</Label>
                  <select
                    id="urgency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    required
                  >
                    <option value="critical">Critical (Immediate)</option>
                    <option value="high">High (Within 24 hours)</option>
                    <option value="medium">Medium (Within 48 hours)</option>
                    <option value="low">Low (Within a week)</option>
                  </select>
                </div>

                {/* Additional Information */}
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    placeholder="Any additional details about the blood request..."
                    rows={4}
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button type="submit" className="flex-1 h-12 text-lg" disabled={loading}>
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Droplet className="w-5 h-5" fill="currentColor" />
                            <span>Submit Request</span>
                        </div>
                    )}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 h-12 text-lg" onClick={() => navigate("/dashboard")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Guidelines */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Guidelines</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="bg-primary/10 rounded-full p-2 h-fit">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">Provide Accurate Information</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ensure all details are correct to help donors reach you quickly
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 rounded-full p-2 h-fit">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">Emergency Requests</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      For critical cases, mark urgency as "Critical" to prioritize notifications
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-primary/10 rounded-full p-2 h-fit">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">Response Time</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      You'll receive donor contacts within minutes of submission
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Blood Compatibility */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Blood Compatibility</h2>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="font-medium text-gray-900 text-sm mb-2">Universal Donor</h3>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-white rounded px-2 py-1 font-semibold text-sm">O-</div>
                    <span className="text-sm text-gray-600">Can donate to all</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="font-medium text-gray-900 text-sm mb-2">Universal Recipient</h3>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-white rounded px-2 py-1 font-semibold text-sm">AB+</div>
                    <span className="text-sm text-gray-600">Can receive from all</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Support */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Need Help?</h2>
              <p className="text-sm text-gray-600 mb-4">
                Contact our 24/7 support team for urgent assistance
              </p>
              <Button variant="outline" className="w-full">
                <Phone className="w-4 h-4 mr-2" />
                Call Support
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}