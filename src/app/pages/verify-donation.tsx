import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import api from "../../lib/api";
import { 
  ClipboardCheck, 
  MapPin, 
  User, 
  Droplets, 
  Calendar, 
  Stethoscope, 
  Lock, 
  BriefcaseMedical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Image as ImageIcon,
  X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { toast } from "sonner";


const VerifyDonation = () => {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [details, setDetails] = useState<any>(null);

    const [formContent, setFormContent] = useState({
        hospitalName: "",
        doctorName: "",
        doctorMedicalId: "",
        doctorPasswordOrOtp: "",
        donationDate: new Date().toISOString().split('T')[0],
        bagsCount: 1,
        notes: "",
        idCardImage: "",
        answers: {} as Record<string, string>
    });

    const questions = [
        { id: "q1", text: "Have you donated blood in the last 3 months?" },
        { id: "q2", text: "Have you had any fever, cold, or illness in the last 7 days?" },
        { id: "q3", text: "Are you currently taking any antibiotics or medications?" },
        { id: "q4", text: "Do you have any chronic diseases (e.g., Diabetes, Hypertension)?" },
        { id: "q5", text: "Did you sleep at least 6 hours last night and have a healthy meal within the last 4 hours?" }
    ];

    const allAnswered = questions.every(q => formContent.answers[q.id]);

    const requestId = searchParams.get("request_id");
    const donorId = searchParams.get("donor_id");
    const patientId = searchParams.get("patient_id");
    const token = searchParams.get("token");

    useEffect(() => {
        const validateToken = async () => {
            if (!requestId || !donorId || !patientId || !token) {
                setError("Missing required parameters in URL.");
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/verify-donation/validate`, {
                    params: { request_id: requestId, donor_id: donorId, patient_id: patientId, token }
                });
                setDetails(response.data);
                setLoading(false);
            } catch (err: any) {
                setError(err.response?.data?.message || "Invalid or expired QR code.");
                setLoading(false);
            }
        };

        validateToken();
    }, [requestId, donorId, patientId, token]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Image size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormContent({ ...formContent, idCardImage: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setFormContent({ ...formContent, idCardImage: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);

        try {
            await api.post(`/verify-donation/submit`, {
                ...formContent,
                questionnaireJson: JSON.stringify(formContent.answers),
                requestId: parseInt(requestId!),
                donorId: parseInt(donorId!),
                patientId: parseInt(patientId!),
                token
            });
            setSuccess(true);
            toast.success("Verification successful!");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Verification failed. Please check your credentials.");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-red-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium font-outfit">Validating secure token...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-t-4 border-t-red-500">
                    <CardContent className="pt-8 text-center">
                        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-outfit">Access Denied</h2>
                        <p className="text-slate-600 mb-6 font-outfit">{error}</p>
                        <Button 
                            className="w-full bg-red-600 hover:bg-red-700"
                            onClick={() => window.close()}
                        >
                            Close Page
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-t-4 border-t-emerald-500">
                    <CardContent className="pt-8 text-center font-outfit">
                        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Verified Successfully</h2>
                        <p className="text-slate-600 mb-6">
                            The donation has been recorded and the request status has been updated. You can now close this window.
                        </p>
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => window.close()}
                        >
                            Done
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-outfit">
            <div className="max-w-2xl mx-auto py-8">
                {/* Header Profile Info */}
                <div className="text-center mb-8">
                    <div className="bg-red-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Donation Verification</h1>
                    <p className="text-slate-500 mt-2">Official Medical Verification Form</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Questionnaire (Microsoft Forms Style) */}
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
                                <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <p className="text-lg font-medium text-slate-800 leading-tight pt-1">
                                            {q.text}
                                        </p>
                                    </div>
                                    <div className="flex gap-4 pl-12">
                                        <Button
                                            type="button"
                                            variant={formContent.answers[q.id] === "YES" ? "default" : "outline"}
                                            className={`flex-1 h-12 rounded-xl text-lg font-bold transition-all ${formContent.answers[q.id] === "YES" ? "bg-indigo-600 ring-4 ring-indigo-100 scale-[1.02]" : "hover:bg-indigo-50"}`}
                                            onClick={() => setFormContent({...formContent, answers: {...formContent.answers, [q.id]: "YES"}})}
                                        >
                                            YES
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formContent.answers[q.id] === "NO" ? "default" : "outline"}
                                            className={`flex-1 h-12 rounded-xl text-lg font-bold transition-all ${formContent.answers[q.id] === "NO" ? "bg-slate-700 ring-4 ring-slate-100 scale-[1.02]" : "hover:bg-slate-50"}`}
                                            onClick={() => setFormContent({...formContent, answers: {...formContent.answers, [q.id]: "NO"}})}
                                        >
                                            NO
                                        </Button>
                                    </div>
                                    <div className="h-px bg-slate-100 mt-6" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Step 2: Participants Summary */}
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
                                <div className="text-sm font-bold text-slate-700">{details.donorName}</div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-400 uppercase tracking-widest">Patient</Label>
                                <div className="text-sm font-bold text-slate-700">{details.patientName}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Doctor Entry Fields */}
                    <Card className="shadow-md border-none bg-white overflow-hidden">
                        <div className="h-2 bg-red-600 w-full" />
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Stethoscope className="h-5 w-5 text-red-500" />
                                Medical Verification details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="hospitalName" className="font-semibold text-slate-700">Hospital Name</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="hospitalName"
                                        className="pl-10 h-11 focus:ring-red-500 transition-all"
                                        placeholder="Enter Hospital Name"
                                        required
                                        value={formContent.hospitalName}
                                        onChange={(e) => setFormContent({...formContent, hospitalName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="doctorName" className="font-semibold text-slate-700">Doctor Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input 
                                            id="doctorName"
                                            className="pl-10 h-11 focus:ring-red-500"
                                            placeholder="Dr. Full Name"
                                            required
                                            value={formContent.doctorName}
                                            onChange={(e) => setFormContent({...formContent, doctorName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="medicalId" className="font-semibold text-slate-700">Doctor Medical ID</Label>
                                    <div className="relative">
                                        <BriefcaseMedical className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input 
                                            id="medicalId"
                                            className="pl-10 h-11 focus:ring-red-500"
                                            placeholder="DOC-xxxxx"
                                            required
                                            value={formContent.doctorMedicalId}
                                            onChange={(e) => setFormContent({...formContent, doctorMedicalId: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="auth" className="font-semibold text-slate-700">Password / OTP</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="auth"
                                        type="password"
                                        className="pl-10 h-11 focus:ring-red-500"
                                        placeholder="Your authentication password"
                                        required
                                        value={formContent.doctorPasswordOrOtp}
                                        onChange={(e) => setFormContent({...formContent, doctorPasswordOrOtp: e.target.value})}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 italic">This is used for electronic signature verification.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="date" className="font-semibold text-slate-700">Donation Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input 
                                            id="date"
                                            type="date"
                                            className="pl-10 h-11 focus:ring-red-500"
                                            required
                                            value={formContent.donationDate}
                                            onChange={(e) => setFormContent({...formContent, donationDate: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bags" className="font-semibold text-slate-700">Bags Count</Label>
                                    <Input 
                                        id="bags"
                                        type="number"
                                        className="h-11 focus:ring-red-500"
                                        min="1"
                                        value={formContent.bagsCount}
                                        onChange={(e) => setFormContent({...formContent, bagsCount: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="idCard" className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Camera className="h-4 w-4" />
                                    Donor ID Card Photo
                                </Label>
                                {!formContent.idCardImage ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                            onChange={handleFileChange}
                                        />
                                        <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                        <p className="text-sm font-medium text-slate-600">Click to capture or upload ID card</p>
                                        <p className="text-xs text-slate-400 mt-1">Required for verification. Max 2MB.</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border shadow-sm">
                                        <img 
                                            src={formContent.idCardImage} 
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
                                <Label htmlFor="notes" className="font-semibold text-slate-700">Notes (Optional)</Label>
                                <Textarea 
                                    id="notes"
                                    placeholder="Any additional observations..."
                                    className="min-h-[100px] focus:ring-red-500"
                                    value={formContent.notes}
                                    onChange={(e) => setFormContent({...formContent, notes: e.target.value})}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Button 
                        type="submit" 
                        disabled={verifying || !allAnswered}
                        className={`w-full h-16 text-xl font-bold shadow-xl active:scale-[0.98] transition-all rounded-2xl ${allAnswered ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        {verifying ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                Processing Medical Record...
                            </div>
                        ) : !allAnswered ? (
                            "Please answer all survey questions"
                        ) : (
                            "Submit Medical Verification"
                        )}
                    </Button>
                </form>

                <div className="mt-8 text-center text-slate-400 text-xs">
                    <p>© 2026 Smart Blood Donation System. Secure Medical Verification Gateway.</p>
                </div>
            </div>
        </div>
    );
};

export default VerifyDonation;
