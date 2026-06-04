import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Droplet, Heart, Calendar, Bell, TrendingUp, MapPin, Phone, LocateFixed, Trash2, LayoutDashboard, Clock, PersonStanding, Check, Droplets, AlertCircle, CheckCheck, X } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";
import { publicBaseUrl } from "../../lib/public-url";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useChat } from "../context/ChatContext";
import { ChatBox } from "../components/chat-box";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openChat, subscribe, isConnected } = useChat();
  const normalizedRole = user?.role?.toUpperCase().replace("ROLE_", "") || "";
  const isAdmin = normalizedRole === "ADMIN";
  const isPatient = normalizedRole === "PATIENT" || isAdmin;
  const isDonor = normalizedRole === "DONOR" || isAdmin;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get("/notifications/me");
        setNotifications(response.data);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };
    
    const fetchStats = async () => {
      try {
        const response = await api.get("/donors/stats");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    fetchStats();
  }, []);

  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [donors, setDonors] = useState<any[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestStatusMap, setRequestStatusMap] = useState<Record<number, string>>({});
  const [requestConfirmMap, setRequestConfirmMap] = useState<
    Record<number, { donorConfirmed: boolean; patientConfirmed: boolean }>
  >({});
  const [qrTokens, setQrTokens] = useState<Record<number, string>>({});
  const [showQrMap, setShowQrMap] = useState<Record<number, boolean>>({});
  const [recommendedDonors, setRecommendedDonors] = useState<Record<number, any[]>>({});
  const [loadingRecommendations, setLoadingRecommendations] = useState<Record<number, boolean>>({});

  // Phase 12: soft-delete confirmation dialog state.
  // `pendingDeleteId` drives the AlertDialog; null = closed.
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  // Phase 12: Clear All confirmation dialog state.
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);
  // Phase 12: don't spam the localhost-QR warning more than once per session.
  const localhostQrWarned = useRef(false);

  const hasActiveRequest = useMemo(() => {
    if (!isPatient) return null;
    return requests.find((req: any) => 
      ["PENDING", "ACCEPTED", "IN_PROGRESS", "MATCHED_DONOR", "HOSPITAL_CONFIRMED", "UNDER_REVIEW"].includes(req.status)
    ) || null;
  }, [requests, isPatient]);

  const fetchRecommendedDonors = async (requestId: number) => {
    if (recommendedDonors[requestId]) {
        setRecommendedDonors(prev => {
            const next = { ...prev };
            delete next[requestId];
            return next;
        });
        return;
    }
    setLoadingRecommendations(prev => ({ ...prev, [requestId]: true }));
    try {
        const response = await api.get(`/requests/${requestId}/recommended-donors`);
        setRecommendedDonors(prev => ({ ...prev, [requestId]: response.data }));
    } catch (error) {
        toast.error("Failed to fetch recommended donors. Only ADMIN/HOSPITAL can view this.");
    } finally {
        setLoadingRecommendations(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.get("/requests");
      const loadedRequests = response.data || [];
      setRequests(loadedRequests);
      const statusMap: Record<number, string> = {};
      const confirmMap: Record<number, { donorConfirmed: boolean; patientConfirmed: boolean }> = {};
      loadedRequests.forEach((req: any) => {
        if (req?.id) {
          statusMap[req.id] = req.status || "PENDING";
          confirmMap[req.id] = {
            donorConfirmed: !!req.donorConfirmed,
            patientConfirmed: !!req.patientConfirmed,
          };
        }
      });
      setRequestStatusMap(statusMap);
      setRequestConfirmMap(confirmMap);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe("/topic/requests", (msg) => {
        if (msg === "NEW_REQUEST") {
          toast.info("A new blood request has been posted!");
          fetchRequests();
        }
      });
      return () => unsubscribe();
    }
  }, [isConnected, subscribe, fetchRequests]);

  useEffect(() => {
    if (!isPatient) {
      setDonorsLoading(false);
      return;
    }

    const fetchDonors = async () => {
      setDonorsLoading(true);
      try {
        const params = user?.bloodType ? `?bloodType=${encodeURIComponent(user.bloodType)}` : "";
        const response = await api.get(`/donors/search${params}`);
        // Filter strictly by the user's exact blood type
        const exactMatches = (response.data || []).filter((d: any) => d?.user?.bloodType === user?.bloodType);
        setDonors(exactMatches);
      } catch (error) {
        console.error("Failed to fetch donors", error);
      } finally {
        setDonorsLoading(false);
      }
    };

    fetchDonors();
  }, [isPatient]);

  const handleHelpNow = (request: any) => {
    toast.success("Donor Connection Process", {
        description: `Please proceed to ${request.hospitalName || "the assigned hospital"}. Code needed for verification.`,
        duration: 10000,
    });
  };

  const getDonorMapLink = (donor: any) => {
    const governorate = donor?.user?.governorate;
    if (!governorate) return null;
    return `https://www.google.com/maps?q=${encodeURIComponent(governorate + ", Egypt")}`;
  };

  const getRequestMapLink = (request: any) => {
    if (request?.requesterMapLink) return request.requesterMapLink;
    if (request?.requesterLatitude && request?.requesterLongitude) {
      return `https://www.google.com/maps?q=${request.requesterLatitude},${request.requesterLongitude}`;
    }
    if (request?.governorate) return `https://www.google.com/maps?q=${encodeURIComponent(request.governorate + ", Egypt")}`;
    return null;
  };

  const getMatchingScore = (donor: any) => {
    let score = 0;
    if (donor?.availabilityStatus === "AVAILABLE") score += 40;
    if (user?.bloodType && donor?.user?.bloodType === user.bloodType) score += 35;
    if (user?.governorate && donor?.user?.governorate === user.governorate) score += 25;
    return Math.min(score, 100);
  };

  const sortedDonors = [...donors].sort((a, b) => getMatchingScore(b) - getMatchingScore(a));

  const getRequestPriorityScore = (request: any) => {
    let score = 0;
    const requestStatus = requestStatusMap[request?.id] || request?.status;
    if (requestStatus === "IN_PROGRESS" || requestStatus === "MATCHED_DONOR" || requestStatus === "ACCEPTED") score += 100;
    else if (requestStatus === "PENDING") score += 50;
    else if (requestStatus === "ON_THE_WAY") score += 25;
    
    if (user?.bloodType && request?.bloodType === user.bloodType) score += 30;
    if (user?.governorate && request?.governorate === user.governorate) score += 20;
    return score;
  };

  const sortedRequests = [...requests]
    .sort((a, b) => {
      const byPriority = getRequestPriorityScore(b) - getRequestPriorityScore(a);
      if (byPriority !== 0) return byPriority;
      return (b.id || 0) - (a.id || 0);
    });

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this browser.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        setLocationLoading(false);
        toast.success("Location detected successfully.");
      },
      () => {
        setLocationLoading(false);
        toast.error("Could not detect location. Please allow location permission.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const statusSequence = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

  const getEffectiveRequestStatus = (request: any) => requestStatusMap[request?.id] || request?.status || "PENDING";

  const getNextStatus = (currentStatus: string) => {
    const index = statusSequence.indexOf(currentStatus);
    if (index === -1 || index === statusSequence.length - 1) return currentStatus;
    return statusSequence[index + 1];
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === "PENDING" || status === "UNDER_REVIEW") return "rounded-lg border-red-200 bg-red-50 text-red-600";
    if (status === "ACCEPTED" || status === "HOSPITAL_CONFIRMED") return "rounded-lg border-green-200 bg-green-50 text-green-700";
    if (status === "IN_PROGRESS" || status === "MATCHED_DONOR") return "rounded-lg border-blue-200 bg-blue-50 text-blue-700";
    if (status === "COMPLETED" || status === "DONATION_COMPLETED") return "rounded-lg border-indigo-200 bg-indigo-50 text-indigo-700";
    return "rounded-lg border-gray-200 bg-gray-50 text-gray-700";
  };

  const updateRequestStatus = async (request: any, nextStatus: string) => {
    if (!request?.id) return;
    const conf = getConfirmState(request.id);

    try {
      const response = await api.patch(`/requests/${request.id}/status`, {
        status: nextStatus,
        donorConfirmed: conf.donorConfirmed,
        patientConfirmed: conf.patientConfirmed,
      });
      const updated = response.data;
      setRequestStatusMap((prev) => ({ ...prev, [request.id]: updated.status || nextStatus }));
      if (nextStatus === "MATCHED_DONOR") {
         setQrTokens(prev => ({ ...prev, [request.id]: "" })); // Trigger token fetch if needed
      }
      setRequestConfirmMap((prev) => ({
        ...prev,
        [request.id]: {
          donorConfirmed: !!updated.donorConfirmed,
          patientConfirmed: !!updated.patientConfirmed,
        },
      }));
      setRequests((prev) =>
        prev.map((req: any) => (req.id === request.id ? { ...req, ...updated } : req))
      );
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error?.response?.data?.message || "Please try again.",
      });
      return;
    }

    toast.success("Request status updated", {
      description: `Request moved to ${nextStatus.replaceAll("_", " ")}`,
      duration: 3000,
    });
  };

  const handleShowQR = async (requestId: number) => {
    // Phase 12: warn (once per session) if the embedded QR URL will point at
    // localhost -- a phone scanning it won't be able to reach the dev machine.
    const base = publicBaseUrl();
    if (base.isLocalhost && !localhostQrWarned.current) {
      localhostQrWarned.current = true;
      toast.warning(
        "This QR will point to localhost. To scan from another device, " +
          "open the dashboard at http://<your-LAN-IP>:5173 or set VITE_PUBLIC_BASE_URL.",
        { duration: 10000 }
      );
    }

    if (qrTokens[requestId]) {
        setShowQrMap(prev => ({ ...prev, [requestId]: !prev[requestId] }));
        return;
    }

    try {
        const response = await api.get(`/verify-donation/token/${requestId}`);
        const token = response?.data?.token;
        if (!token) {
            toast.error("Backend returned no token. Check that the request has a hospital assigned.");
            console.error("QR token endpoint returned no token", response?.data);
            return;
        }
        setQrTokens(prev => ({ ...prev, [requestId]: token }));
        setShowQrMap(prev => ({ ...prev, [requestId]: true }));
    } catch (error: any) {
        // Surface the actual backend reason instead of a generic message so the
        // operator can self-diagnose. Common causes:
        //  - 401: JWT expired/missing  -> log in again
        //  - 403: wrong role or this isn't your matched request
        //  - 404: request id not found in DB
        //  - 500: request has no hospital_id (most common after Phase 11) OR
        //         the donor profile for this user doesn't exist
        //  - network/CORS: backend not running, or accessed via a non-allowed origin
        console.error("Show QR failed", error);
        const status: number | undefined = error?.response?.status;
        const backendMsg: string | undefined =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            (typeof error?.response?.data === "string" ? error.response.data : undefined);

        let friendly = "Failed to generate QR.";
        if (!status) {
            friendly = "Backend not reachable. Is the Spring Boot server running on :8080?";
        } else if (status === 401) {
            friendly = "Session expired. Please log out and log in again.";
        } else if (status === 403) {
            friendly = "Only the donor matched to this request can generate its QR.";
        } else if (status === 404) {
            friendly = "This request no longer exists in the database.";
        } else if (status >= 500) {
            friendly = backendMsg
                ? `Server error: ${backendMsg}`
                : "Server error. The request likely has no hospital assigned, or your donor profile is missing.";
        } else if (backendMsg) {
            friendly = backendMsg;
        }
        toast.error(friendly, { duration: 8000 });
    }
  };

  /**
   * Phase 12: Soft-delete via the new `DELETE /api/requests/{id}` endpoint.
   * For ACCEPTED / IN_PROGRESS we pass `?confirmed=true` because the strong
   * warning is already shown to the user in the AlertDialog. Admin still has
   * the hard-delete path via `/admin/requests/{id}` if needed -- not used
   * from this UI anymore.
   */
  const performDeleteRequest = async (requestId: number) => {
    const target = requests.find((r: any) => r.id === requestId);
    const needsConfirmedFlag = target && (target.status === "ACCEPTED" || target.status === "IN_PROGRESS");
    const url = needsConfirmedFlag
      ? `/requests/${requestId}?confirmed=true`
      : `/requests/${requestId}`;
    try {
      await api.delete(url);
      // Optimistic local update so the card disappears immediately.
      setRequests(prev => prev.filter((r: any) => r.id !== requestId));
      toast.success("Request deleted.");
    } catch (error: any) {
      console.error("Failed to delete request", error);
      const status = error?.response?.status;
      const msg =
        error?.response?.data?.message ||
        (status === 403
          ? "You can only delete your own requests."
          : status === 409
          ? "This request can no longer be deleted."
          : status === 404
          ? "Request not found."
          : "Failed to delete request.");
      toast.error(msg);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const canDeleteRequest = (request: any): boolean => {
    if (!user || !request) return false;
    const status = request.status;
    if (status === "COMPLETED" || status === "REJECTED" || status === "CANCELLED" || status === "DONATION_COMPLETED") {
      return false;
    }
    const isOwningPatient = request.userId === user.id;
    const isMatchedDonor = request.matchedDonorId === user.id;
    return isAdmin || isOwningPatient || isMatchedDonor;
  };

  // Phase 12: Notifications -- Read All + Clear All.
  const handleMarkAllRead = async () => {
    try {
      await api.post(`/notifications/read-all`);
      setNotifications(prev => prev.map((n: any) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read.");
    } catch (e) {
      console.error("Mark all as read failed", e);
      toast.error("Couldn't mark all as read.");
    }
  };

  const handleClearAll = async () => {
    setConfirmClearAllOpen(false);
    try {
      await api.delete(`/notifications/clear-all`);
      // Soft-clear: rows stay in DB but disappear from the user's panel.
      setNotifications([]);
      toast.success("Notifications cleared.");
    } catch (e) {
      console.error("Clear all failed", e);
      toast.error("Couldn't clear notifications.");
    }
  };

  const getConfirmState = (requestId: number) =>
    requestConfirmMap[requestId] || { donorConfirmed: false, patientConfirmed: false };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10 relative overflow-hidden bg-gradient-to-br from-primary to-primary-foreground rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-primary/20">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">{getTimeGreeting()}, {user?.name.split(' ')[0]}!</h1>
            <p className="text-primary-foreground/80 text-sm sm:text-lg font-medium">Your contribution to life flow matters today.</p>
          </div>
          <div className="absolute right-[-2%] top-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
                { title: "Total Donations", value: stats?.totalDonations || "0", icon: Droplet, desc: "Total verified donations", color: "red" },
                { title: "Lives Saved", value: stats?.livesSaved || "0", icon: Heart, desc: "Estimated impact", color: "pink" },
                { title: "Next Eligible", value: stats?.daysUntilEligible > 0 ? `${stats.daysUntilEligible} Days` : "Ready", icon: Calendar, desc: stats?.nextEligibleDate || "Available Now", color: "indigo" },
                { title: "Impact Score", value: stats?.impactScore || "0", icon: TrendingUp, desc: "Based on donation history", color: "amber" }
            ].map((s, idx) => (
                <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl group overflow-hidden">
                    <div className="relative z-10">
                        <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{s.title}</p>
                        <h3 className="text-3xl font-black text-gray-900 mt-1">{s.value}</h3>
                        <p className="text-xs text-gray-400 mt-2 font-medium">{s.desc}</p>
                    </div>
                </Card>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <Card className="p-6 sm:p-8 border-none shadow-sm rounded-3xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 underline decoration-primary/20 decoration-4 underline-offset-8">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isPatient || isAdmin) && (
                  <>
                    <Button className="h-32 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-red-50 text-gray-900 text-lg font-bold flex-col gap-3 group transition-all" asChild>
                      <Link to="/request-blood">
                        <div className="p-3 bg-red-100 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
                            <Heart className="w-8 h-8" />
                        </div>
                        <span>Request Blood</span>
                      </Link>
                    </Button>
                    <Button className="h-32 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-blue-50 text-gray-900 text-lg font-bold flex-col gap-3 group transition-all" asChild>
                      <Link to="/search-donors">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                            <Droplet className="w-8 h-8" fill="currentColor" />
                        </div>
                        <span>Find Donors</span>
                      </Link>
                    </Button>
                  </>
                )}
                {(isDonor || isAdmin) && (
                  <Button className="h-32 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-green-50 text-gray-900 text-lg font-bold flex-col gap-3 group transition-all" asChild>
                    <Link to="/eligibility-form">
                      <div className="p-3 bg-green-100 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                        <Check className="w-8 h-8" />
                      </div>
                      <span>Can I Donate?</span>
                    </Link>
                  </Button>
                )}
                {isAdmin && (
                  <Button className="h-32 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-primary/5 text-gray-900 text-lg font-bold flex-col gap-3 group transition-all" asChild>
                    <Link to="/admin">
                      <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                          <LayoutDashboard className="w-8 h-8" />
                      </div>
                      <span>Admin Panel</span>
                    </Link>
                  </Button>
                )}
                <Button className="h-32 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-indigo-50 text-gray-900 text-lg font-bold flex-col gap-3 group transition-all" asChild>
                  <Link to="/profile">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <span>Update Profile</span>
                  </Link>
                </Button>
                <Button className="h-32 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:bg-amber-50 text-gray-900 text-lg font-bold flex-col gap-3 group transition-all">
                  <div className="p-3 bg-amber-100 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                    <Bell className="w-8 h-8" />
                  </div>
                  <span>Notifications</span>
                </Button>
              </div>
            </Card>

            {/* Unified Blood Requests & Donors Area */}
            {hasActiveRequest && !isAdmin && (
              <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-[2rem] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 shrink-0 shadow-sm border border-amber-200/50">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-amber-900">Active Request Queue Blocked</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      You currently have an active request for <strong className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded">{hasActiveRequest.bloodType}</strong> blood (Status: <span className="font-black uppercase text-amber-800 tracking-tight">{hasActiveRequest.status.replace(/_/g, ' ')}</span>).
                    </p>
                    <p className="text-[13px] text-amber-700/80 mt-1 font-medium">You will not be able to submit new requests until this request is fully resolved or cancelled.</p>
                  </div>
                </div>
                <Button variant="outline" className="h-12 px-6 rounded-xl border-amber-300 text-amber-800 hover:bg-amber-100 font-bold whitespace-nowrap bg-white shadow-sm" asChild>
                  <Link to="/request-blood">Request Status</Link>
                </Button>
              </div>
            )}

            <Card className="p-6 sm:p-8 border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 font-black uppercase tracking-tight">
                  {isPatient ? "My Blood Requests & Donors" : "Blood Requests & Donors"}
                </h2>
                <p className="text-gray-500 text-sm italic">Connecting heroes with those in need of life-saving blood.</p>
              </div>

              <div className="space-y-12">
                {/* 1. Donors Section */}
                {(isPatient || isAdmin) && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 border-l-4 border-primary pl-4">Recommended Donors</h3>
                      <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5" asChild>
                        <Link to="/search-donors">VIEW ALL</Link>
                      </Button>
                    </div>
                    
                    {donorsLoading ? (
                      <div className="py-12 text-center text-gray-400">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="font-medium">Finding matching donors...</p>
                      </div>
                    ) : sortedDonors.length > 0 ? (
                      <div className="grid gap-4">
                        {sortedDonors.slice(0, 5).map((donor: any) => {
                          const cleanPhone = (donor?.user?.phone || "").replace(/\D/g, "");
                          const donorMapLink = getDonorMapLink(donor);
                          return (
                            <div key={donor.user.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/20 transition-all bg-gray-50/30 group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                                  {donor?.user?.bloodType || "--"}
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 leading-tight">{donor?.user?.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] uppercase font-black px-2 py-0.5">{donor?.availabilityStatus || "AVAILABLE"}</Badge>
                                    <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> {donor?.user?.governorate}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="rounded-lg h-9 font-bold border-gray-200" asChild>
                                  <a href={cleanPhone ? `tel:${cleanPhone}` : "#"}><Phone className="w-3.5 h-3.5 mr-1.5" /> Call</a>
                                </Button>
                                {donorMapLink && (
                                  <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0 text-primary hover:bg-primary/5" asChild>
                                    <a href={donorMapLink} target="_blank" rel="noreferrer"><MapPin className="w-4 h-4" /></a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 border-2 border-dashed border-gray-100 rounded-3xl text-center bg-gray-50/50">
                        <Droplet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm font-medium">No donors available at the moment.</p>
                      </div>
                    )}
                  </section>
                )}

                {/* 2. Urgent Requests Section */}
                {(isDonor || isAdmin || isPatient) && (
                  <section className={(isPatient || isAdmin) ? "pt-8 border-t border-gray-100" : ""}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 border-l-4 border-red-500 pl-4">
                          {isPatient ? "My Active Requests" : "Urgent Help Needed"}
                        </h3>
                        {isDonor && user?.bloodType && (
                          <p className="text-sm text-gray-500 mt-1 pl-4">Showing compatible blood requests for your blood type: <span className="font-bold text-red-600">{user.bloodType}</span></p>
                        )}
                      </div>
                    </div>

                    {requestsLoading ? (
                      <div className="py-12 text-center text-gray-400">
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="font-medium">Loading patient requests...</p>
                      </div>
                    ) : sortedRequests.length > 0 ? (
                      <div className="grid gap-4 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                        {sortedRequests.map((request: any) => {
                          const effectiveStatus = getEffectiveRequestStatus(request);
                          const nextStatus = getNextStatus(effectiveStatus);
                          const isCompleted = effectiveStatus === "COMPLETED";
                          const requestMapLink = getRequestMapLink(request);
                          
                          return (
                            <div key={request.id} className="p-5 border border-red-50 rounded-2xl bg-red-50/20 hover:border-red-200 transition-all group/request">
                               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-red-200 uppercase group-hover/request:scale-105 transition-transform">
                                      {request.bloodType}
                                    </div>
                                    <div>
                                      <h4 className="font-black text-gray-900 text-lg">Patient: {request.patientName || request.userName}</h4>
                                      <div className="text-sm font-semibold text-gray-700">
                                        Bags Needed: {request.bagsNeeded || 1} | Confirmed Donors: {request.confirmedDonors || 0}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                         <Badge className={`${getStatusBadgeClass(effectiveStatus)} border-none text-[10px] font-black uppercase px-2 py-0.5 flex items-center gap-1`}>
                                           {(effectiveStatus === "PENDING" || effectiveStatus === "UNDER_REVIEW") && <Clock className="w-3 h-3" />}
                                           {effectiveStatus === "HOSPITAL_CONFIRMED" && <Check className="w-3 h-3" />}
                                           {effectiveStatus === "MATCHED_DONOR" && <PersonStanding className="w-3 h-3" />}
                                           {effectiveStatus === "DONATION_COMPLETED" && <Droplets className="w-3 h-3" />}
                                           {effectiveStatus.replace(/_/g, ' ')}
                                         </Badge>
                                         {request.urgencyLevel && (
                                           <Badge className={`${request.urgencyLevel.toLowerCase() === 'emergency' ? 'bg-red-600 text-white' : request.urgencyLevel.toLowerCase() === 'urgent' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white'} border-none text-[10px] font-black uppercase px-2 py-0.5`}>
                                             {request.urgencyLevel}
                                           </Badge>
                                         )}
                                         <span className="text-[11px] text-gray-500 font-bold tracking-tight bg-white/50 px-2 py-0.5 rounded-lg border border-red-100/50">{request.governorate} • {request.requestDate}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                     <Button variant="secondary" className="rounded-xl h-10 font-bold bg-white border border-gray-200 shadow-sm transition-colors hover:bg-gray-50" onClick={() => handleHelpNow(request)}>
                                       Help Info
                                     </Button>
                                     {isAdmin && (
                                        <Button variant="outline" className="rounded-xl h-10 font-bold border-primary text-primary" onClick={() => fetchRecommendedDonors(request.id)}>
                                            {loadingRecommendations[request.id] ? "Loading..." : "Top Donors"}
                                        </Button>
                                     )}
                                     {canDeleteRequest(request) && (
                                        <Button
                                          variant="ghost"
                                          className="h-10 w-10 p-0 rounded-xl text-red-500 hover:bg-red-50"
                                          title="Delete request"
                                          onClick={() => setPendingDeleteId(request.id)}
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </Button>
                                      )}
                                     {requestMapLink && (
                                       <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-red-50 group/map" asChild>
                                         <a href={requestMapLink} target="_blank" rel="noreferrer"><LocateFixed className="w-5 h-5 text-red-500 group-hover/map:scale-110 transition-transform" /></a>
                                       </Button>
                                     )}
                                  </div>
                               </div>
                               
                               <div className="flex items-center justify-between pt-3 border-t border-red-100/50">
                                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Action</span>
                                     {isDonor && (effectiveStatus === "IN_PROGRESS" || effectiveStatus === "ACCEPTED") && (
                                       <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-[10px] font-black border-red-200 text-red-600 hover:bg-red-50 uppercase tracking-widest h-8 px-3 rounded-lg"
                                        onClick={() => handleShowQR(request.id)}
                                       >
                                         {showQrMap[request.id] ? "Hide QR" : "Scan to Verify"}
                                       </Button>
                                     )}
                                     <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-[10px] font-black text-primary hover:text-white hover:bg-primary uppercase tracking-widest h-8 px-3 rounded-lg border border-primary/20"
                                      disabled={!(isDonor && effectiveStatus === "PENDING")}
                                      onClick={() => {
                                        if (isDonor && effectiveStatus === "PENDING") {
                                          navigate(`/eligibility-form?requestId=${request.id}`);
                                        }
                                      }}
                                    >
                                      {effectiveStatus === "COMPLETED" ? "Completed ✓" : (effectiveStatus === "IN_PROGRESS" || effectiveStatus === "ACCEPTED") ? "Matched (Go to Hospital)" : (isDonor && effectiveStatus === "PENDING") ? "Check Eligibility & Accept →" : "Awaiting Process"}
                                    </Button>
                                  </div>
  
                               {showQrMap[request.id] && qrTokens[request.id] && (
                                  <div className="mt-4 p-6 bg-white border border-dashed border-red-200 rounded-2xl flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                      <div className="p-4 bg-white rounded-xl shadow-md border">
                                        <QRCodeCanvas
                                          value={`${publicBaseUrl().url}/verify-donation?request_id=${request.id}&donor_id=${user?.id}&patient_id=${request.userId}&token=${encodeURIComponent(qrTokens[request.id])}`}
                                          size={180}
                                          level="H"
                                          includeMargin={true}
                                        />
                                     </div>
                                     <div className="text-center">
                                        <p className="text-sm font-bold text-slate-900">Patient Verification QR</p>
                                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Doctor must scan this to complete process</p>
                                     </div>
                                     <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-red-600 font-mono text-[10px]">
                                        Token: {qrTokens[request.id].substring(0, 16)}...
                                     </div>
                                  </div>
                               )}

                               {recommendedDonors[request.id] && (
                                  <div className="mt-4 p-4 bg-white border border-gray-200 rounded-2xl animate-in fade-in duration-300">
                                      <h5 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2">Top Recommended Donors</h5>
                                      {recommendedDonors[request.id].length > 0 ? (
                                          <div className="space-y-3">
                                              {recommendedDonors[request.id].map((donor: any) => (
                                                  <div key={donor.donorId} className="p-3 border border-gray-100 bg-gray-50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                      <div>
                                                          <div className="flex items-center gap-2">
                                                              <h6 className="font-bold text-gray-900">{donor.donorName}</h6>
                                                              <Badge className="bg-primary/10 text-primary border-none text-[10px]">{donor.bloodType}</Badge>
                                                              <span className="text-xs font-bold text-amber-500">Score: {donor.recommendationScore}</span>
                                                          </div>
                                                          <p className="text-xs text-gray-500 mt-1">{donor.recommendationReason}</p>
                                                      </div>
                                                      <div className="text-right">
                                                          <div className="text-xs font-bold text-gray-700">Donations: {donor.totalDonations}</div>
                                                          <div className="text-xs font-bold text-gray-700">{donor.distanceKm ? `${donor.distanceKm.toFixed(1)} km away` : 'Distance unknown'}</div>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <p className="text-sm text-gray-500">No eligible recommended donors found.</p>
                                      )}
                                  </div>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 border-2 border-dashed border-gray-100 rounded-3xl text-center bg-gray-50/50">
                        <Heart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm font-medium">No blood requests at the moment.</p>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Profile Summary */}
            <Card className="p-6 sm:p-8 border-none shadow-sm rounded-3xl bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase">{user?.role}</Badge>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Identity Card</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                      {user?.name?.[0]}
                   </div>
                   <div>
                      <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Full Name</div>
                      <div className="text-lg font-bold text-gray-900">{user?.name}</div>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 rounded-2xl p-3.5 text-primary">
                    <Droplet className="w-7 h-7" fill="currentColor" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Blood Type</div>
                    <div className="text-2xl font-black text-gray-900">{user?.bloodType || "Not Set"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 rounded-2xl p-3.5 text-primary">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Region</div>
                    <div className="text-lg font-bold text-gray-900">{user?.governorate || "Egypt"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 rounded-2xl p-3.5 text-primary">
                    <Phone className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Contact</div>
                    <div className="text-lg font-bold text-gray-900">{user?.phone || "No Phone"}</div>
                  </div>
                </div>
                <Button className="w-full mt-4 h-12 rounded-xl border-gray-100 hover:bg-primary/5 hover:text-primary transition-all font-bold" variant="outline" asChild>
                  <Link to="/profile">MANAGE PROFILE</Link>
                </Button>

                {user?.role !== "DONOR" && user?.role !== "ADMIN" && (
                   <Button 
                    variant="default"
                    className="w-full mt-3 h-12 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all font-black"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to become a donor? You will be visible to hospitals and patients in need.")) {
                        try {
                          const response = await api.post("/donors/register-me");
                          toast.success("Welcome, Donor!", {
                            description: response.data.message || "Your role has been upgraded successfully.",
                          });
                          window.location.reload();
                        } catch (error: any) {
                          const errorMsg = error.response?.data?.message || error.response?.data || "Failed to upgrade role.";
                          toast.error(errorMsg);
                        }
                      }
                    }}
                  >
                    BECOME A DONOR
                  </Button>
                )}

                {user?.role === "DONOR" && (
                  <Button 
                    variant="outline"
                    className="w-full mt-3 h-12 rounded-xl border-red-100 text-red-600 hover:bg-red-50 transition-all font-black"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to stop being a donor? You will no longer appear in searches.")) {
                        try {
                          await api.delete("/donors/unregister-me");
                          toast.success("Role Reverted", {
                            description: "You are now a Patient again.",
                          });
                          window.location.reload();
                        } catch (error) {
                          toast.error("Failed to revert role.");
                        }
                      }
                    }}
                  >
                    STOP DONATING
                  </Button>
                )}
                {isAdmin && (
                  <Button className="w-full mt-3 h-12 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all font-bold" asChild>
                    <Link to="/admin">MANAGE SYSTEM (ADMIN)</Link>
                  </Button>
                )}
              </div>
            </Card>

            {/* Notifications */}
            <Card className="p-6 sm:p-8 border-none shadow-sm rounded-3xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                  <div className="min-w-[1.5rem] h-6 px-2 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                      {notifications.length}
                  </div>
                </div>
              </div>
              {/* Phase 12: Read All + Clear All actions */}
              {notifications.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={handleMarkAllRead}
                    disabled={notifications.every((n: any) => n.isRead)}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Read All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-8 font-bold border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmClearAllOpen(true)}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}
              {/* Phase 12: fixed-height scroll container so a long list doesn't blow up the page */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-2xl border-l-4 transition-all hover:bg-gray-50 ${
                      notification.type === "urgent" || notification.type === "URGENT"
                        ? "bg-red-50/30 border-red-500"
                        : "bg-blue-50/30 border-blue-500"
                    } ${notification.isRead ? "opacity-70" : ""}`}
                  >
                    <p className="text-sm font-bold text-gray-900">{notification.message}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-tighter">{notification.time}</p>
                  </div>
                )) : (
                    <div className="py-8 text-center text-gray-400 font-medium">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-10" />
                        <p>No new updates</p>
                    </div>
                )}
              </div>
            </Card>

            {/* Smart Location */}
            <Card className="p-6 sm:p-8 border-none shadow-sm rounded-3xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Smart Location</h2>
                <LocateFixed className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Share your live location for faster donor-patient coordination.
              </p>
              <Button className="w-full mb-4" onClick={handleDetectLocation} disabled={locationLoading}>
                {locationLoading ? "Detecting location..." : "Use My Current Location"}
              </Button>
              {currentLocation && (
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    Latitude: {currentLocation.lat.toFixed(6)}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    Longitude: {currentLocation.lng.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Footer />

      {/* Phase 12: Delete-request confirmation. Driven by `pendingDeleteId`. */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const r = requests.find((x: any) => x.id === pendingDeleteId);
                if (r && (r.status === "ACCEPTED" || r.status === "IN_PROGRESS")) {
                  return "This request has a matched donor. Deleting will cancel the donation arrangement. Are you sure?";
                }
                return "Are you sure you want to delete this request? The record stays in the database for history but disappears from your list.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId !== null) performDeleteRequest(pendingDeleteId);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Phase 12: Clear-all-notifications confirmation. */}
      <AlertDialog open={confirmClearAllOpen} onOpenChange={setConfirmClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll disappear from your panel but stay in the database for history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
