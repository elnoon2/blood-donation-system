import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { 
  User, 
  Phone, 
  Fingerprint, 
  Droplets, 
  MapPin, 
  Calendar, 
  BriefcaseMedical, 
  Hospital, 
  Stethoscope, 
  ClipboardList,
  Loader2,
  CheckCircle2,
  Heart,
  Camera,
  Image as ImageIcon,
  X,
  ShieldCheck,
  MapPinned
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api";

export const DonorFormPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const requestId = searchParams.get("request_id");

    const [form, setForm] = useState({
        requestId: requestId ? parseInt(requestId) : null,
        // Patient
        patientName: "",
        patientNationalId: "",
        bloodType: "",
        patientPhone: "",
        patientAge: "",
        patientGovernorate: "",
        patientAddress: "",
        notes: "",
        // Doctor
        doctorName: "",
        doctorIdNumber: "",
        doctorIdImage: ""
    });

    const governs = ["Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Fayyum", "Gharbia", "Ismailia", "Monufia", "Minya", "Qalyubia", "New Valley", "Suez", "Aswan", "Assiut", "Beni Suef", "Port Said", "Damietta", "Sharkia", "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", "North Sinai", "Sohag"];
    const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, doctorIdImage: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!form.patientName || !form.patientNationalId || !form.bloodType || !form.patientPhone || !form.doctorName || !form.doctorIdNumber) {
            toast.error("All required fields must be filled!");
            return;
        }

        if (!form.doctorIdImage) {
            toast.error("Doctor's ID Card Image is REQUIRED for verification!");
            return;
        }

        if (isNaN(parseInt(form.patientAge))) {
            toast.error("Patient Age must be numeric.");
            return;
        }

        if (!/^\d{14}$/.test(form.patientNationalId)) {
            toast.error("Invalid National ID. Must be 14 digits.");
            return;
        }

        if (!/^\d{11}$/.test(form.patientPhone)) {
            toast.error("Invalid Patient Phone. Must be 11 digits.");
            return;
        }

        setSubmitting(true);
        try {
            await api.post("/verify-donation/form-submit", {
                ...form,
                patientAge: parseInt(form.patientAge)
            });
            setSuccess(true);
            toast.success("Medical record submitted successfully!");
        } catch (error) {
            toast.error("Submission failed. Please check your data.");
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 shadow-2xl border-none">
                    <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-14 w-14 text-green-600" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">Verification Complete</CardTitle>
                    <CardDescription className="text-lg">
                        The medical record has been permanently signed and stored in our secure database.
                    </CardDescription>
                    <Button 
                        asChild
                        className="mt-8 w-full h-12 text-lg font-bold bg-slate-900"
                    >
                        <Link to="/">Exit System</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9] pb-20">
            {/* Professional Header */}
            <div className="bg-slate-900 text-white pt-16 pb-24 px-4 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-4 border border-white/10 backdrop-blur-xl">
                    <ShieldCheck className="h-9 w-9 text-blue-400" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">Medical Verification Portal</h1>
                <p className="text-slate-400 mt-2 max-w-lg mx-auto font-medium">Verified donation intake handled by medical professionals.</p>
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-16">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Patient Information */}
                    <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-white border-b border-slate-100 py-6">
                            <CardTitle className="text-xl flex items-center gap-3 text-slate-900">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <User className="h-6 w-6 text-red-600" />
                                </div>
                                Section I: Patient (Receiver)
                            </CardTitle>
                            <CardDescription>Enter the identity details of the patient receiving the blood.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Patient Full Name *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Official name" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                            value={form.patientName}
                                            onChange={(e) => setForm({...form, patientName: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Patient Phone *</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="01xxxxxxxxx" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200"
                                            value={form.patientPhone}
                                            onChange={(e) => setForm({...form, patientPhone: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">National ID *</Label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="14 digits" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200"
                                            value={form.patientNationalId}
                                            onChange={(e) => setForm({...form, patientNationalId: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Age *</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            type="number" 
                                            placeholder="Patient Age" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200"
                                            value={form.patientAge}
                                            onChange={(e) => setForm({...form, patientAge: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Blood Type *</Label>
                                    <div className="relative">
                                        <Droplets className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 z-10" />
                                        <select 
                                            className="w-full h-12 pl-10 pr-3 rounded-md border border-slate-200 bg-slate-50 relative focus:ring-2 focus:ring-blue-500 appearance-none font-bold"
                                            value={form.bloodType}
                                            onChange={(e) => setForm({...form, bloodType: e.target.value})}
                                            required
                                        >
                                            <option value="">Select Type</option>
                                            {bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Governorate *</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 z-10" />
                                        <select 
                                            className="w-full h-12 pl-10 pr-3 rounded-md border border-slate-200 bg-slate-50 relative focus:ring-2 focus:ring-blue-500 appearance-none"
                                            value={form.patientGovernorate}
                                            onChange={(e) => setForm({...form, patientGovernorate: e.target.value})}
                                            required
                                        >
                                            <option value="">Select Region</option>
                                            {governs.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-full space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Detailed Address *</Label>
                                    <div className="relative">
                                        <MapPinned className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Textarea 
                                            placeholder="Specific address or district..." 
                                            className="pl-10 min-h-[80px] bg-slate-50 border-slate-200 focus:bg-white"
                                            value={form.patientAddress}
                                            onChange={(e) => setForm({...form, patientAddress: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Doctor (Authorized Personnel) Information */}
                    <Card className="shadow-2xl border-none overflow-hidden rounded-[2rem]">
                        <CardHeader className="bg-white border-b border-slate-100 py-6">
                            <CardTitle className="text-xl flex items-center gap-3 text-slate-900">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Stethoscope className="h-6 w-6 text-blue-600" />
                                </div>
                                Section II: Medical Authorized Personnel (Doctor)
                            </CardTitle>
                            <CardDescription>Details of the medical professional overseeing the verification.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Doctor Full Name *</Label>
                                    <div className="relative">
                                        <Stethoscope className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Authorized Doctor Name" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200"
                                            value={form.doctorName}
                                            onChange={(e) => setForm({...form, doctorName: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold ml-1">Doctor ID / License Number *</Label>
                                    <div className="relative">
                                        <BriefcaseMedical className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder="Reg. Number" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200"
                                            value={form.doctorIdNumber}
                                            onChange={(e) => setForm({...form, doctorIdNumber: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="col-span-full space-y-4">
                                    <Label className="text-slate-700 font-bold ml-1 flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-blue-500" />
                                        Authorized ID Card Photo *
                                    </Label>
                                    {!form.doctorIdImage ? (
                                        <div className="border-2 border-dashed border-blue-100 rounded-2xl p-10 text-center bg-white hover:bg-blue-50 transition-all cursor-pointer relative group">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                                onChange={handleFileChange}
                                                required
                                            />
                                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <Camera className="h-8 w-8 text-blue-600" />
                                            </div>
                                            <p className="text-lg font-bold text-slate-700">Capture Doctor ID Card</p>
                                            <p className="text-sm text-slate-400 mt-1">This is a mandatory step for legal verification.</p>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-xl max-w-md mx-auto">
                                            <img 
                                                src={form.doctorIdImage} 
                                                alt="Doctor ID Preview" 
                                                className="w-full h-auto object-cover"
                                            />
                                            <button 
                                                type="button"
                                                className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors"
                                                onClick={() => setForm({...form, doctorIdImage: ""})}
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="col-span-full space-y-2 pt-4">
                                    <Label className="text-slate-700 font-bold ml-1">Additional Verification Notes</Label>
                                    <div className="relative">
                                        <ClipboardList className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Textarea 
                                            placeholder="Enter any medical observations or patient history notes..." 
                                            className="pl-10 min-h-[100px] bg-slate-50 border-slate-200"
                                            value={form.notes}
                                            onChange={(e) => setForm({...form, notes: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-2xl transition-all active:scale-[0.98] rounded-2xl uppercase tracking-widest border-b-4 border-blue-900"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                                Verifying & Signing...
                            </>
                        ) : "Finalize Medical Verification"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
