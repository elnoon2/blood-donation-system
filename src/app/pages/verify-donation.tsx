import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import axios from "axios";
import {
  ClipboardCheck,
  MapPin,
  User,
  Stethoscope,
  Lock,
  BriefcaseMedical,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Image as ImageIcon,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { toast } from "sonner";

/**
 * PUBLIC page reachable from any device by scanning the donation QR code.
 *
 * No browser login required. The QR token in the URL authenticates the page;
 * the hospital staff's email + password (entered inline) authenticate the
 * submission. See audit/11-qr-flow-rebuild.md.
 *
 * Uses a dedicated axios instance so the regular `lib/api.ts` Bearer-token
 * interceptor never attaches a stale donor JWT to these public calls (which
 * would otherwise cause 403 from Spring Security against the
 * @PreAuthorize-free permitAll route).
 */
const publicApi = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

type ValidationState =
  | { kind: "loading" }
  | { kind: "missing-params" }
  | { kind: "invalid"; reason: "not_found" | "used" | "expired" | "signature" | "network" }
  | {
      kind: "ready";
      donorName: string;
      patientName: string;
      hospitalName: string;
      hospitalId: number | string;
      bloodType: string;
      bagsNeeded: number;
      expiresAt: string;
    };

const VerifyDonation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request_id");
  const donorId = searchParams.get("donor_id");
  const patientId = searchParams.get("patient_id");
  const token = searchParams.get("token");

  const [state, setState] = useState<ValidationState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    staffEmail: "",
    doctorPasswordOrOtp: "",
    hospitalName: "",
    doctorName: "",
    doctorMedicalId: "",
    donationDate: new Date().toISOString().split("T")[0],
    bagsCount: 1,
    notes: "",
    idCardImage: "",
    answers: {} as Record<string, "YES" | "NO">,
  });

  const questions = [
    { id: "q1", text: "Have you donated blood in the last 3 months?" },
    { id: "q2", text: "Have you had any fever, cold, or illness in the last 7 days?" },
    { id: "q3", text: "Are you currently taking any antibiotics or medications?" },
    { id: "q4", text: "Do you have any chronic diseases (e.g., Diabetes, Hypertension)?" },
    {
      id: "q5",
      text: "Did you sleep at least 6 hours last night and have a healthy meal within the last 4 hours?",
    },
  ];

  const allAnswered = questions.every((q) => form.answers[q.id]);

  useEffect(() => {
    if (!token) {
      setState({ kind: "missing-params" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await publicApi.get(`/verify-donation/validate`, {
          params: { token },
        });
        if (cancelled) return;
        const data = res.data || {};
        if (!data.valid) {
          setState({ kind: "invalid", reason: (data.reason as ValidationState["kind"] extends infer _ ? never : never) ?? "not_found" } as ValidationState);
          // narrow type properly
          setState({
            kind: "invalid",
            reason:
              data.reason === "used" ||
              data.reason === "expired" ||
              data.reason === "signature" ||
              data.reason === "not_found"
                ? data.reason
                : "not_found",
          });
          return;
        }
        setState({
          kind: "ready",
          donorName: data.donorName ?? "",
          patientName: data.patientName ?? "",
          hospitalName: data.hospitalName ?? "",
          hospitalId: data.hospitalId ?? "",
          bloodType: data.bloodType ?? "",
          bagsNeeded: data.bagsNeeded ?? 0,
          expiresAt: data.expiresAt ?? "",
        });
        // Prefill hospital name into the form for staff convenience
        setForm((f) => ({ ...f, hospitalName: data.hospitalName ?? "" }));
      } catch (err: any) {
        if (cancelled) return;
        // 404 -> not_found, 410 -> expired, 401 -> signature, 409 -> used
        const status = err?.response?.status;
        if (status === 404) setState({ kind: "invalid", reason: "not_found" });
        else if (status === 410) setState({ kind: "invalid", reason: "expired" });
        else if (status === 409) setState({ kind: "invalid", reason: "used" });
        else if (status === 401) setState({ kind: "invalid", reason: "signature" });
        else setState({ kind: "invalid", reason: "network" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, idCardImage: reader.result as string });
    reader.readAsDataURL(file);
  };

  const removeImage = () => setForm({ ...form, idCardImage: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) {
      toast.error("Please answer all survey questions.");
      return;
    }
    if (!form.staffEmail.trim() || !form.doctorPasswordOrOtp.trim()) {
      toast.error("Staff email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.post(`/verify-donation/submit`, {
        token,
        requestId: requestId ? parseInt(requestId, 10) : undefined,
        donorId: donorId ? parseInt(donorId, 10) : undefined,
        patientId: patientId ? parseInt(patientId, 10) : undefined,
        staffEmail: form.staffEmail.trim(),
        doctorPasswordOrOtp: form.doctorPasswordOrOtp,
        hospitalName: form.hospitalName,
        doctorName: form.doctorName,
        doctorMedicalId: form.doctorMedicalId,
        donationDate: form.donationDate,
        bagsCount: form.bagsCount,
        notes: form.notes,
        idCardImage: form.idCardImage,
        questionnaireJson: JSON.stringify(form.answers),
      });
      setSuccess(true);
      toast.success("Donation verified.");
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 401
          ? "Wrong staff email or password."
          : status === 403
          ? "This QR belongs to a different hospital, or your account cannot verify donations."
          : status === 409
          ? "This donation was already verified."
          : status === 410
          ? "This QR has expired."
          : "Submission failed.");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------- Render states -------------------------------

  if (state.kind === "loading") {
    return (
      <FullScreenCenter>
        <Loader2 className="h-10 w-10 animate-spin text-red-600 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Validating QR token…</p>
      </FullScreenCenter>
    );
  }

  if (state.kind === "missing-params") {
    return (
      <ErrorCard
        title="Invalid QR Code"
        message="The QR code link is missing the required parameters. Please ask the donor to regenerate the QR."
      />
    );
  }

  if (state.kind === "invalid") {
    const messages: Record<string, string> = {
      not_found: "This QR code is not recognised. It may have been generated on a different system.",
      used: "This QR code has already been used to verify a donation. It cannot be used again.",
      expired: "This QR code has expired. The donor should generate a new one (valid for 24 hours).",
      signature: "This QR code's signature is invalid. The link may have been tampered with.",
      network: "Could not reach the verification server. Check your connection and try again.",
    };
    return <ErrorCard title="QR Code Invalid" message={messages[state.reason]} />;
  }

  if (success) {
    return (
      <FullScreenCenter>
        <Card className="max-w-md w-full shadow-lg border-t-4 border-t-emerald-500">
          <CardContent className="pt-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verified Successfully</h2>
            <p className="text-slate-600 mb-6">
              The donation has been recorded and the request is now COMPLETED. You can close this page.
            </p>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => window.close()}
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </FullScreenCenter>
    );
  }

  // state.kind === "ready"
  return (
    <div className="min-h-screen bg-slate-50 p-4 font-outfit">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="bg-red-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Donation Verification</h1>
          <p className="text-slate-500 mt-2">Official Medical Verification Form</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Pre-Donation Health Survey */}
          <Card className="shadow-lg border-none bg-white overflow-hidden">
            <div className="h-2 bg-indigo-600 w-full" />
            <CardHeader className="pb-4 border-b bg-indigo-50/30">
              <CardTitle className="text-xl flex items-center gap-2 text-indigo-900">
                <ClipboardCheck className="h-6 w-6 text-indigo-600" />
                Pre-Donation Health Survey
              </CardTitle>
              <CardDescription>Please answer all legal health checks truthfully.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-lg font-medium text-slate-800 leading-tight pt-1">{q.text}</p>
                  </div>
                  <div className="flex gap-4 pl-12">
                    <Button
                      type="button"
                      variant={form.answers[q.id] === "YES" ? "default" : "outline"}
                      className={`flex-1 h-12 rounded-xl text-lg font-bold transition-all ${
                        form.answers[q.id] === "YES"
                          ? "bg-indigo-600 ring-4 ring-indigo-100 scale-[1.02]"
                          : "hover:bg-indigo-50"
                      }`}
                      onClick={() =>
                        setForm({ ...form, answers: { ...form.answers, [q.id]: "YES" } })
                      }
                    >
                      YES
                    </Button>
                    <Button
                      type="button"
                      variant={form.answers[q.id] === "NO" ? "default" : "outline"}
                      className={`flex-1 h-12 rounded-xl text-lg font-bold transition-all ${
                        form.answers[q.id] === "NO"
                          ? "bg-slate-700 ring-4 ring-slate-100 scale-[1.02]"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() =>
                        setForm({ ...form, answers: { ...form.answers, [q.id]: "NO" } })
                      }
                    >
                      NO
                    </Button>
                  </div>
                  <div className="h-px bg-slate-100 mt-6" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Step 2: Verified identities */}
          <Card className="shadow-sm border-none bg-white opacity-90">
            <CardHeader className="py-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-500 uppercase tracking-widest">
                <User className="h-4 w-4" />
                Verified identities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Donor</Label>
                <div className="text-sm font-bold text-slate-700">{state.donorName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Patient
                </Label>
                <div className="text-sm font-bold text-slate-700">{state.patientName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Blood type
                </Label>
                <div className="text-sm font-bold text-red-600">{state.bloodType}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Bags</Label>
                <div className="text-sm font-bold text-slate-700">{state.bagsNeeded}</div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Staff credentials + doctor entry */}
          <Card className="shadow-md border-none bg-white overflow-hidden">
            <div className="h-2 bg-red-600 w-full" />
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-red-500" />
                Hospital Staff Verification
              </CardTitle>
              <CardDescription>
                Sign in with your hospital account (no browser login needed).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="staffEmail" className="font-semibold text-slate-700">
                  Hospital staff email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="staffEmail"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className="pl-10 h-11 focus:ring-red-500"
                    placeholder="staff@hospital.example"
                    required
                    value={form.staffEmail}
                    onChange={(e) => setForm({ ...form, staffEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth" className="font-semibold text-slate-700">
                  Hospital account password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="auth"
                    type="password"
                    autoComplete="current-password"
                    className="pl-10 h-11 focus:ring-red-500"
                    placeholder="Your hospital account password"
                    required
                    value={form.doctorPasswordOrOtp}
                    onChange={(e) =>
                      setForm({ ...form, doctorPasswordOrOtp: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospitalName" className="font-semibold text-slate-700">
                  Hospital name
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="hospitalName"
                    className="pl-10 h-11 focus:ring-red-500"
                    placeholder={state.hospitalName || "Hospital name"}
                    required
                    value={form.hospitalName}
                    onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="doctorName" className="font-semibold text-slate-700">
                    Doctor Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="doctorName"
                      className="pl-10 h-11 focus:ring-red-500"
                      placeholder="Dr. Full Name"
                      required
                      value={form.doctorName}
                      onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicalId" className="font-semibold text-slate-700">
                    Doctor Medical ID
                  </Label>
                  <div className="relative">
                    <BriefcaseMedical className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="medicalId"
                      className="pl-10 h-11 focus:ring-red-500"
                      placeholder="DOC-xxxxx"
                      required
                      value={form.doctorMedicalId}
                      onChange={(e) =>
                        setForm({ ...form, doctorMedicalId: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date" className="font-semibold text-slate-700">
                    Donation Date
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="date"
                      type="date"
                      className="pl-10 h-11 focus:ring-red-500"
                      required
                      value={form.donationDate}
                      onChange={(e) => setForm({ ...form, donationDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bags" className="font-semibold text-slate-700">
                    Bags Count
                  </Label>
                  <Input
                    id="bags"
                    type="number"
                    className="h-11 focus:ring-red-500"
                    min={1}
                    value={form.bagsCount}
                    onChange={(e) =>
                      setForm({ ...form, bagsCount: parseInt(e.target.value || "1", 10) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Donor ID Card Photo
                </Label>
                {!form.idCardImage ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-slate-600">
                      Tap to capture or upload ID card
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Max 2MB.</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border shadow-sm">
                    <img
                      src={form.idCardImage}
                      alt="ID Card Preview"
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold text-slate-700">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional observations…"
                  className="min-h-[100px] focus:ring-red-500"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={submitting || !allAnswered}
            className={`w-full h-16 text-xl font-bold shadow-xl active:scale-[0.98] transition-all rounded-2xl ${
              allAnswered && !submitting
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                Processing Medical Record…
              </div>
            ) : !allAnswered ? (
              "Please answer all survey questions"
            ) : (
              "Submit Medical Verification"
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-slate-400 text-xs">
          © 2026 Smart Blood Donation System · Secure Medical Verification Gateway
        </div>
      </div>
    </div>
  );
};

// -------------------------------- helpers --------------------------------

const FullScreenCenter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="text-center max-w-md w-full">{children}</div>
  </div>
);

const ErrorCard: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <FullScreenCenter>
    <Card className="max-w-md w-full shadow-lg border-t-4 border-t-red-500">
      <CardContent className="pt-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-6">{message}</p>
        <Button
          className="w-full bg-red-600 hover:bg-red-700"
          onClick={() => window.close()}
        >
          Close
        </Button>
      </CardContent>
    </Card>
  </FullScreenCenter>
);

export default VerifyDonation;
