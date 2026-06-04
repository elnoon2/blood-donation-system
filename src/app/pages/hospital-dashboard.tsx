import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Search, 
  CheckCircle2, 
  Clock, 
  PersonStanding, 
  Droplet,
  ShieldCheck,
  AlertCircle,
  Inbox,
  Check,
  X,
  QrCode,
  FileText
} from "lucide-react";
import { useState, useEffect } from "react";
import api from "../../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export function HospitalDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"triage" | "verify" | "history">("triage");
  
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReviewing, setIsReviewing] = useState<number | null>(null);

  // QR verification state
  const [qrToken, setQrToken] = useState("");
  const [isQrSubmitting, setIsQrSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "triage") {
        const response = await api.get("/hospital/requests");
        const list = response.data || [];
        setIncomingRequests(list.filter((r: any) => r.status === "PENDING" || r.status === "UNDER_REVIEW"));
      } else if (activeTab === "verify") {
        const response = await api.get("/hospital/pending");
        setPendingRequests(response.data || []);
      } else {
        const response = await api.get("/hospital/history");
        setHistoryRequests(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId: number, decision: "APPROVE" | "REJECT") => {
    if (!window.confirm(`Are you sure you want to ${decision} this blood request?`)) return;
    setIsReviewing(requestId);
    try {
      await api.put(`/hospital/requests/${requestId}/review?decision=${decision}`);
      toast.success(`Request ${decision.toLowerCase()}d successfully.`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${decision.toLowerCase()} request.`);
    } finally {
      setIsReviewing(null);
    }
  };

  const handleVerify = async (requestId: number) => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      await api.post(`/hospital/verify/${requestId}?code=${verificationCode}`);
      toast.success("Donation verified successfully!");
      setVerifyingId(null);
      setVerificationCode("");
      fetchData(); // Refresh list
    } catch (error: any) {
      const message = error.response?.data?.message || "Verification failed";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQrTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim()) {
      toast.error("Please scan or enter a secure verification token");
      return;
    }

    let extractedToken = qrToken.trim();
    // Support scanning/pasting the full link automatically!
    try {
      if (extractedToken.includes("?")) {
        const urlParams = new URLSearchParams(extractedToken.split("?")[1]);
        const parsed = urlParams.get("token");
        if (parsed) {
          extractedToken = parsed;
        }
      }
    } catch (err) {
      console.error("Failed to parse QR token link, using raw input instead", err);
    }

    setIsQrSubmitting(true);
    try {
      const res = await api.post(`/hospital/scan-qr`, {
        secureSignedToken: extractedToken
      });
      toast.success("QR Donation Verified and Logged successfully!", {
        description: `Successfully completed O-type/compatible donation for patient: ${res.data?.patientName || "Verified Patient"}`,
        duration: 5000
      });
      setQrToken("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "QR Code signature verification failed. Token might be expired or already used.");
    } finally {
      setIsQrSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="space-y-2">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 mb-2">
              Verification Authority Enabled
            </Badge>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              {user?.hospital?.name || "Hospital Dashboard"}
            </h1>
            <p className="text-gray-500 font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {user?.hospital?.location}, {user?.hospital?.governorate}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Security Status</p>
              <p className="text-sm font-black text-gray-900">Anti-Trafficking Gateway Active</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button 
            variant={activeTab === "triage" ? "default" : "outline"}
            className={`font-bold h-12 rounded-xl px-6 ${activeTab === "triage" ? "bg-black hover:bg-gray-900 shadow-md text-white border-black" : "hover:bg-gray-50 text-gray-700"}`}
            onClick={() => { setActiveTab("triage"); setVerifyingId(null); }}
          >
            <Inbox className="w-5 h-5 mr-2" />
            Incoming Triage Requests
          </Button>
          <Button 
            variant={activeTab === "verify" ? "default" : "outline"}
            className={`font-bold h-12 rounded-xl px-6 ${activeTab === "verify" ? "bg-primary hover:bg-red-700 shadow-md text-white border-primary" : "hover:bg-gray-50 text-gray-700"}`}
            onClick={() => setActiveTab("verify")}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Active Verifications
          </Button>
          <Button 
            variant={activeTab === "history" ? "default" : "outline"}
            className={`font-bold h-12 rounded-xl px-6 ${activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-700 shadow-md text-white border-indigo-600" : "hover:bg-gray-50 text-gray-700"}`}
            onClick={() => { setActiveTab("history"); setVerifyingId(null); }}
          >
            <FileText className="w-5 h-5 mr-2" />
            Donation Ledger (History)
          </Button>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                {activeTab === "triage" && "Pending Triage Review"}
                {activeTab === "verify" && "Pending Verification"}
                {activeTab === "history" && "Completed Donation Ledger"}
                <Badge className="bg-gray-100 text-gray-600 border-none ml-2">
                  {activeTab === "triage" && incomingRequests.length}
                  {activeTab === "verify" && pendingRequests.length}
                  {activeTab === "history" && historyRequests.length}
                </Badge>
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData}
                className="font-bold border-2 hover:bg-gray-50"
              >
                Refresh List
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : activeTab === "triage" && incomingRequests.length === 0 ? (
              <Card className="p-12 text-center bg-white border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Inbox className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">No Requests to Triage</h3>
                <p className="text-gray-500 max-w-sm mx-auto font-medium text-sm">
                  You have reviewed all incoming blood requests assigned to your facility.
                </p>
              </Card>
            ) : activeTab === "verify" && pendingRequests.length === 0 ? (
              <Card className="p-12 text-center bg-white border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">No Donors Pending</h3>
                <p className="text-gray-500 max-w-sm mx-auto font-medium text-sm">
                  There are currently no donors reported to be at your facility. Use the QR Scan Token portal on the right to verify an incoming transaction.
                </p>
              </Card>
            ) : activeTab === "history" && historyRequests.length === 0 ? (
              <Card className="p-12 text-center bg-white border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">Ledger is Empty</h3>
                <p className="text-gray-500 max-w-sm mx-auto font-medium text-sm">
                  No verified donations have been logged at this facility yet.
                </p>
              </Card>
            ) : activeTab === "history" ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Donor</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Quantity</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {historyRequests.map((hist) => (
                        <tr key={hist.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-semibold text-gray-600">{hist.donationDate || "Today"}</td>
                          <td className="p-4 font-bold text-gray-900">{hist.donorName || `Donor #${hist.donorId}`}</td>
                          <td className="p-4 font-bold text-gray-900">{hist.patientName || `Patient #${hist.patientId}`}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 font-bold">
                              {hist.bloodType}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-gray-600">{hist.quantity || 1} Bag(s)</td>
                          <td className="p-4">
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none font-bold text-[10px] uppercase">
                              Verified
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {(activeTab === "triage" ? incomingRequests : pendingRequests).map((req) => (
                  <Card key={req.id} className={`p-6 border-none shadow-sm hover:shadow-md transition-all group border-l-4 ${activeTab === "triage" ? "border-l-blue-400" : "border-l-amber-400"}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-700 font-black text-xl flex items-center justify-center shadow-sm">
                           {req.bloodType}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-gray-900 text-lg flex items-center gap-2">
                             {req.userName || req.patientName || `Patient #${req.userId || "Unknown"}`}
                          </h4>
                          <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                            {activeTab === "triage" ? (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase">
                                <Clock className="w-3 h-3" />
                                Awaiting Triage
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] uppercase">
                                <PersonStanding className="w-3 h-3" />
                                Donor Assigned
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {req.requestDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {activeTab === "triage" ? (
                          <>
                             <Button 
                               variant="outline" 
                               className="font-black h-10 border-green-200 text-green-600 hover:bg-green-50"
                               disabled={isReviewing === req.id}
                               onClick={() => handleReview(req.id, "APPROVE")}
                             >
                                <Check className="w-4 h-4 mr-2" /> Approve
                             </Button>
                             <Button 
                               variant="outline" 
                               className="font-black h-10 border-red-200 text-red-600 hover:bg-red-50"
                               disabled={isReviewing === req.id}
                               onClick={() => handleReview(req.id, "REJECT")}
                             >
                                <X className="w-4 h-4 mr-2" /> Reject
                             </Button>
                          </>
                        ) : (
                          <Button 
                            onClick={() => setVerifyingId(req.id)}
                            className="font-black h-12 px-8 bg-black hover:bg-gray-900 rounded-xl text-white"
                          >
                            Verify Donor Code
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Verification Sidebar / Instructions */}
          <div className="space-y-6 text-sans">
            {activeTab === "triage" ? (
              <Card className="p-8 bg-gray-900 text-white rounded-3xl overflow-hidden relative border-none shadow-xl">
                 <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-4">Triage Policy</h3>
                  <div className="space-y-4 text-gray-400 text-sm font-medium">
                    <p className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-black shrink-0 text-xs">1</span>
                      Review the incoming patient blood request to ensure it is valid.
                    </p>
                    <p className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-black shrink-0 text-xs">2</span>
                      Click Approve to publicly list the request and notify donors.
                    </p>
                    <p className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-black shrink-0 text-xs">3</span>
                      Click Reject if the request is illegitimate or cannot be accommodated.
                    </p>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl -mr-16 -mt-16" />
              </Card>
            ) : activeTab === "verify" ? (
              <>
                {/* QR Code Scan Input Portal */}
                <Card className="p-6 border-2 border-red-500 bg-white shadow-xl rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-xl rounded-full" />
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
                    <QrCode className="w-5 h-5 text-red-600 animate-pulse" />
                    QR Scan Gateway
                  </h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
                    Paste the secure QR transaction link or token signature to complete the donation transaction immediately.
                  </p>

                  <form onSubmit={handleQrTokenSubmit} className="space-y-4">
                    <div>
                      <Input 
                        placeholder="Scan / Paste secure token..."
                        className="h-11 text-xs focus-visible:ring-red-500"
                        value={qrToken}
                        onChange={(e) => setQrToken(e.target.value)}
                      />
                      <p className="text-[10px] text-gray-400 mt-1 italic">
                        Supports full transaction URLs scanned from donor devices.
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Medical Compliance
                      </div>
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <input type="checkbox" required className="w-4 h-4 mt-0.5 accent-primary rounded cursor-pointer shrink-0" />
                        <span className="text-[11px] leading-tight font-bold text-gray-500 group-hover:text-gray-900">
                          Confirm physical screening & donor identity match matches records.
                        </span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-md"
                      disabled={isQrSubmitting}
                    >
                      {isQrSubmitting ? "Processing..." : "Complete QR Transaction"}
                    </Button>
                  </form>
                </Card>

                {verifyingId ? (
                  <Card className="p-8 border-2 border-primary bg-white shadow-xl animate-in zoom-in-95 duration-300 rounded-3xl">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Enter Code</h2>
                      <Button variant="ghost" size="sm" onClick={() => setVerifyingId(null)} className="font-bold text-gray-500">
                        Cancel
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-600 font-medium mb-6">
                      Please ask the donor to show the 6-digit verification code from their app.
                    </p>

                    <div className="space-y-4">
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
                        <Input 
                          placeholder="000000"
                          maxLength={6}
                          className="h-16 pl-14 text-3xl font-black tracking-[0.5em] focus-visible:ring-primary border-2 border-gray-100 placeholder:text-gray-200"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                          <AlertCircle className="w-3 h-3" />
                          Verification Checklist
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" required className="w-4 h-4 accent-primary rounded cursor-pointer" />
                          <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">I confirm donor identity and screening</span>
                        </label>
                      </div>

                      <Button 
                        className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-xl shadow-lg shadow-red-100"
                        disabled={verificationCode.length !== 6 || isVerifying}
                        onClick={() => handleVerify(verifyingId)}
                      >
                        {isVerifying ? "Verifying..." : "Confirm Donation"}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 bg-black text-white rounded-3xl overflow-hidden relative border-none shadow-xl">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black mb-4">Verification Policy</h3>
                      <div className="space-y-4 text-gray-400 text-sm font-medium">
                        <p className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-black shrink-0 text-xs">1</span>
                          Ask for the donor's digital verification code.
                        </p>
                        <p className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-black shrink-0 text-xs">2</span>
                          Perform standard medical screening for the blood type required.
                        </p>
                        <p className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-black shrink-0 text-xs">3</span>
                          Enter the code to finalize the transaction.
                        </p>
                      </div>
                    </div>
                    {/* Visual accents */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 blur-3xl -ml-16 -mb-16" />
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl overflow-hidden relative border-none shadow-xl">
                <div className="relative z-10 space-y-6">
                  <h3 className="text-2xl font-black">Ledger Statistics</h3>
                  
                  <div className="space-y-4">
                    <div className="border-b border-white/10 pb-4">
                      <p className="text-xs text-indigo-200 uppercase font-black tracking-wider">Total Verified Donations</p>
                      <p className="text-4xl font-black mt-1 text-white">{historyRequests.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-200 uppercase font-black tracking-wider">Hospital Jurisdiction</p>
                      <p className="text-sm font-bold mt-1 text-indigo-100">{user?.hospital?.name || "Official Facility"}</p>
                    </div>
                  </div>

                  <div className="text-xs text-indigo-300 leading-relaxed pt-2">
                    Our digital ledger acts as a secure, immutable compliance audit system to prevent illicit sales or trafficking of blood bags.
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mb-16" />
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
