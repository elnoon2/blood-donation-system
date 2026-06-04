import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
// Force Vite refresh: 2026-04-10-17-06
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { GOVERNORATES, BLOOD_TYPES } from "../../lib/location-data";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Droplet, Building2, MapPin, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

import api from "../../lib/api";

export function RequestBloodPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasActiveRequest, setHasActiveRequest] = useState<null | any>(null);
  const [activeRequestLoading, setActiveRequestLoading] = useState(true);
  const [requesterLocation, setRequesterLocation] = useState<{ lat: number; lng: number; mapLink: string } | null>(null);
  // Phase 13: seed form from the authenticated patient's profile. Fields
  // remain editable so the patient can submit on behalf of a family member.
  const [formData, setFormData] = useState({
    bloodType: user?.bloodType || "A+",
    units: "1",
    hospitalId: (user as any)?.hospital?.id ?? ("" as string | number),
    patientName: user?.name || "",
    governorate: user?.governorate || "Cairo",
    phone: user?.phone || "",
    urgency: "medium",
    additionalInfo: "",
  });

  // Phase 13: when the auth hydrates after the initial mount (common for
  // route-protected pages that render before the AuthContext settles), copy
  // profile fields into any form field that's still on its default empty
  // value. We deliberately avoid overwriting a field the patient has typed.
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      bloodType: prev.bloodType && prev.bloodType !== "A+" ? prev.bloodType : (user.bloodType || prev.bloodType),
      patientName: prev.patientName?.trim() ? prev.patientName : (user.name || ""),
      governorate: prev.governorate && prev.governorate !== "Cairo" ? prev.governorate : (user.governorate || prev.governorate),
      phone: prev.phone?.trim() ? prev.phone : (user.phone || ""),
      hospitalId: prev.hospitalId || (user as any)?.hospital?.id || prev.hospitalId,
    }));
  }, [user]);

  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [availableHospitals, setAvailableHospitals] = useState<any[]>([]);

  // Check if the user already has an active blood request
  useEffect(() => {
    const checkActiveRequest = async () => {
      try {
        const response = await api.get("/requests");
        const myRequests: any[] = response.data || [];
        const active = myRequests.find(
          (req) => req.status === "PENDING" || req.status === "ACCEPTED" || req.status === "IN_PROGRESS"
        );
        setHasActiveRequest(active || null);
      } catch (err) {
        console.error("Failed to check active requests:", err);
        setHasActiveRequest(null);
      } finally {
        setActiveRequestLoading(false);
      }
    };
    checkActiveRequest();
  }, []);

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
                setFormData(prev => ({ ...prev, hospitalId: response.data[0].id }));
            } else {
                console.warn("No hospitals found for this governorate.");
                setAvailableHospitals([]);
                setFormData(prev => ({ ...prev, hospitalId: "" }));
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
    
    if (!formData.bloodType || !formData.units || !formData.governorate || !formData.phone || !formData.patientName) {
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
        patientName: formData.patientName,
        bagsNeeded: parseInt(formData.units),
        urgencyLevel: formData.urgency,
        hospitalId: formData.hospitalId ? Number(formData.hospitalId) : null,
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

        {/* Active Request Blocking Banner */}
        {!activeRequestLoading && hasActiveRequest && (
          <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-300 rounded-[1.5rem] flex flex-col gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900">You Already Have an Active Blood Request</h3>
                <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                  Your request for <strong>{hasActiveRequest.bloodType}</strong> blood is currently <strong>{hasActiveRequest.status}</strong>.
                  To protect donation queues and ensure donors aren't overwhelmed, patients can only have one active request at a time.
                </p>
                <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                  Please cancel your existing request from the Dashboard if it's no longer needed, or wait for it to be fulfilled.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                asChild
              >
                <Link to="/dashboard">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  View My Active Request
                </Link>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 font-bold"
                onClick={() => navigate(-1)}
              >
                Go Back
              </Button>
            </div>
          </div>
        )}

        {activeRequestLoading && (
          <div className="mb-8 flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-gray-500">Checking for existing requests...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-5 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Name */}
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Full Name *</Label>
                  <Input
                    id="patientName"
                    placeholder="e.g., John Doe"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    required
                  />
                </div>

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
                      value={formData.hospitalId}
                      onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                      disabled={hospitalsLoading}
                    >
                      <option value="">(Optional) No Specific Hospital</option>
                      {!hospitalsLoading && availableHospitals.map((h) => (
                        <option key={h.id} value={h.id}>{h.name} - {h.location}</option>
                      ))}
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
                    <option value="Emergency">Emergency</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
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
                  <Button type="submit" className="flex-1 h-12 text-lg" disabled={loading || !!hasActiveRequest}>
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting...</span>
                        </div>
                    ) : hasActiveRequest ? (
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span>Active Request Exists</span>
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