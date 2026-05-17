import { Link, useNavigate } from "react-router";
import { Droplet, Mail, Lock, User, UserCircle, Phone, MapPin, Check, ArrowLeft, ArrowRight, Calendar, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../../lib/api";
import { toast } from "sonner";
import { GOVERNORATES, BLOOD_TYPES } from "../../lib/location-data";

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    bloodType: "A+",
    governorate: "Cairo",
    phone: "",
    role: "donor",
    // Donor specific basic details
    age: "",
    weight: "",
    gender: "Male",
    lastDonationDate: "",
    // Health questions
    doYouHaveFever: false,
    doYouHaveColdOrFlu: false,
    doYouHaveChronicDisease: false,
    chronicDiseaseDetails: "",
    doYouHaveHeartDisease: false,
    doYouHaveDiabetes: false,
    doYouHaveHighBloodPressure: false,
    doYouHaveAnemia: false,
    doYouHaveHepatitis: false,
    doYouHaveKidneyDisease: false,
    doYouHaveBloodDisorder: false,
    areYouPregnantOrRecentlyPregnant: false,
    doYouHaveRecentTattooOrPiercing: false,
    doYouHaveRecentInfection: false,
    // Lifestyle questions
    sleptWellLastNight: false,
    ateBeforeDonation: false,
    drankEnoughWater: false,
    doYouAgreeToMedicalReview: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.governorate) {
        toast.error("Please fill in all required basic fields.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (formData.role === "donor") {
        if (!formData.age || !formData.weight || !formData.gender) {
          toast.error("Please specify your Age, Weight, and Gender.");
          return;
        }
        const parsedAge = parseInt(formData.age);
        const parsedWeight = parseFloat(formData.weight);
        if (isNaN(parsedAge) || isNaN(parsedWeight) || parsedAge <= 0 || parsedWeight <= 0) {
          toast.error("Please enter a valid age and weight.");
          return;
        }
      }
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.role === "donor" && step < 3) {
      nextStep();
      return;
    }

    setLoading(true);
    try {
      // 1. Submit Register Request
      await api.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        bloodType: formData.bloodType,
        governorate: formData.governorate,
        phone: formData.phone,
        role: formData.role.toUpperCase(),
      });

      // 2. Perform Automatic Sign In
      const loginResponse = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });
      const { token } = loginResponse.data;

      // 3. Fetch Full Profile
      const meResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fullUserData = meResponse.data;

      // 4. Submit Eligibility Assessment for Donors
      if (formData.role === "donor") {
        try {
          const payload = {
            fullName: formData.name,
            age: parseInt(formData.age),
            gender: formData.gender,
            weight: parseFloat(formData.weight),
            bloodType: formData.bloodType,
            phone: formData.phone,
            email: formData.email,
            governorate: formData.governorate,
            lastDonationDate: formData.lastDonationDate || null,
            doYouHaveFever: formData.doYouHaveFever,
            doYouHaveColdOrFlu: formData.doYouHaveColdOrFlu,
            doYouHaveChronicDisease: formData.doYouHaveChronicDisease,
            chronicDiseaseDetails: formData.chronicDiseaseDetails,
            doYouHaveHeartDisease: formData.doYouHaveHeartDisease,
            doYouHaveDiabetes: formData.doYouHaveDiabetes,
            doYouHaveHighBloodPressure: formData.doYouHaveHighBloodPressure,
            doYouHaveAnemia: formData.doYouHaveAnemia,
            doYouHaveHepatitis: formData.doYouHaveHepatitis,
            doYouHaveKidneyDisease: formData.doYouHaveKidneyDisease,
            doYouHaveBloodDisorder: formData.doYouHaveBloodDisorder,
            areYouPregnantOrRecentlyPregnant: formData.areYouPregnantOrRecentlyPregnant,
            doYouHaveRecentTattooOrPiercing: formData.doYouHaveRecentTattooOrPiercing,
            doYouHaveRecentInfection: formData.doYouHaveRecentInfection,
            sleptWellLastNight: formData.sleptWellLastNight,
            ateBeforeDonation: formData.ateBeforeDonation,
            drankEnoughWater: formData.drankEnoughWater,
            doYouAgreeToMedicalReview: formData.doYouAgreeToMedicalReview,
            currentEnergyLevel: "Good",
          };

          const checkResponse = await api.post("/donor-eligibility/check", payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Login context session
          login(token, fullUserData);
          toast.success("Account created and eligibility checked successfully!");
          navigate("/eligibility-result", { state: { result: checkResponse.data } });
          return;
        } catch (eligError) {
          console.error("Eligibility check failed during registration setup", eligError);
        }
      }

      // Successful registration fallback (e.g. Patient role)
      login(token, fullUserData);
      toast.success("Account created successfully!");
      navigate("/dashboard");

    } catch (error: any) {
      console.error(error);
      const status = error.response?.status;
      const responseData = error.response?.data;
      let message = "Something went wrong. Please try again.";

      if (!error.response) {
        message = `Cannot reach backend at ${api.defaults.baseURL}. Please verify startup scripts are running.`;
      } else if (responseData?.message && typeof responseData.message === "string") {
        message = responseData.message;
      } else if (responseData?.error && typeof responseData.error === "string") {
        message = responseData.error;
      }
      
      toast.error("Registration failed", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Community / Onboarding Info */}
        <div className="hidden lg:flex flex-col items-center justify-center p-12">
          <div className="text-center space-y-6">
            <div className="bg-primary/10 w-32 h-32 rounded-full flex items-center justify-center mx-auto">
              <Droplet className="w-16 h-16 text-primary" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Join Our Community</h2>
            <p className="text-lg text-gray-600 max-w-md">
              {formData.role === "donor" 
                ? "Provide your details and complete the quick assessment to see if you can start donating right away."
                : "Become a registered member and seek compatible blood donors instantly."
              }
            </p>
            {formData.role === "donor" && (
              <div className="flex flex-col gap-3 pt-6 text-left max-w-md mx-auto bg-white/60 backdrop-blur p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm tracking-wide uppercase">Assessment Steps</h4>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                  <span className="text-sm font-medium text-gray-700">Account & Basic Information</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                  <span className="text-sm font-medium text-gray-700">Health Questions Checklist</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                  <span className="text-sm font-medium text-gray-700">Lifestyle & Consent Form</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Multi-step Register Form */}
        <Card className="p-8 sm:p-12 shadow-xl border-gray-100">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
              <div className="bg-primary rounded-lg p-2">
                <Droplet className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Smart Blood Donation</span>
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {formData.role === "donor" ? `Create Donor Account` : `Create Patient Account`}
            </h1>
            <p className="text-gray-600">
              {formData.role === "donor" 
                ? `Step ${step} of 3: ${step === 1 ? "Basic Info" : step === 2 ? "Health Assessment" : "Consent"}`
                : "Join us in saving lives through blood donation"
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: Basic Account Registration Details */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        className="pl-10"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <select
                      id="bloodType"
                      name="bloodType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.bloodType}
                      onChange={handleChange}
                      required
                    >
                      {BLOOD_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="governorate">Governorate</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        id="governorate"
                        name="governorate"
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.governorate}
                        onChange={handleChange}
                        required
                      >
                        {GOVERNORATES.map((gov) => (
                          <option key={gov} value={gov}>{gov}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Register as</Label>
                    <RadioGroup
                      value={formData.role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-3 hover:border-primary transition-colors cursor-pointer">
                        <RadioGroupItem value="donor" id="donor" />
                        <Label htmlFor="donor" className="flex-1 cursor-pointer font-bold text-center">
                          Donor
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border border-gray-200 rounded-lg p-3 hover:border-primary transition-colors cursor-pointer">
                        <RadioGroupItem value="patient" id="patient" />
                        <Label htmlFor="patient" className="flex-1 cursor-pointer font-bold text-center">
                          Patient
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Additional Donor Step 1 fields */}
                {formData.role === "donor" && (
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Additional Donor Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          name="age"
                          type="number"
                          placeholder="e.g. 25"
                          value={formData.age}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                          id="weight"
                          name="weight"
                          type="number"
                          placeholder="e.g. 70"
                          value={formData.weight}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          name="gender"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
                          value={formData.gender}
                          onChange={handleChange}
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastDonationDate" className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> Last Donation Date (If any)</Label>
                      <Input
                        id="lastDonationDate"
                        name="lastDonationDate"
                        type="date"
                        value={formData.lastDonationDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Health Questions Checklist (Donor Only) */}
            {step === 2 && formData.role === "donor" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-primary" /> Health Questions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {[
                    { name: 'doYouHaveFever', label: 'Do you currently have a fever?' },
                    { name: 'doYouHaveColdOrFlu', label: 'Do you have cold or flu symptoms?' },
                    { name: 'doYouHaveHeartDisease', label: 'Do you have any heart disease?' },
                    { name: 'doYouHaveDiabetes', label: 'Are you diabetic?' },
                    { name: 'doYouHaveHighBloodPressure', label: 'Do you have high blood pressure?' },
                    { name: 'doYouHaveAnemia', label: 'Have you ever been diagnosed with anemia?' },
                    { name: 'doYouHaveHepatitis', label: 'Have you ever had hepatitis?' },
                    { name: 'doYouHaveKidneyDisease', label: 'Do you have kidney disease?' },
                    { name: 'doYouHaveBloodDisorder', label: 'Do you have any blood disorders?' },
                    { name: 'areYouPregnantOrRecentlyPregnant', label: 'Are you pregnant or recently pregnant?' },
                    { name: 'doYouHaveRecentTattooOrPiercing', label: 'Had a tattoo or piercing in the last 6 months?' },
                    { name: 'doYouHaveRecentInfection', label: 'Any recent infections requiring antibiotics?' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                      <input 
                        type="checkbox" 
                        id={item.name} 
                        name={item.name} 
                        checked={formData[item.name as keyof typeof formData] as boolean} 
                        onChange={handleChange} 
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" 
                      />
                      <label htmlFor={item.name} className="text-xs font-semibold text-gray-700 cursor-pointer w-full leading-tight select-none">{item.label}</label>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="doYouHaveChronicDisease" 
                      checked={formData.doYouHaveChronicDisease} 
                      onChange={handleChange} 
                      className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" 
                    />
                    <span className="text-xs font-semibold text-gray-700 select-none">Do you have any chronic disease?</span>
                  </label>
                  {formData.doYouHaveChronicDisease && (
                    <Input 
                      placeholder="Please specify..." 
                      name="chronicDiseaseDetails" 
                      value={formData.chronicDiseaseDetails} 
                      onChange={handleChange} 
                      className="mt-2"
                      required
                    />
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Lifestyle & Consent Form (Donor Only) */}
            {step === 3 && formData.role === "donor" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Lifestyle & Consent</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { name: 'sleptWellLastNight', label: 'Did you sleep well last night?' },
                    { name: 'ateBeforeDonation', label: 'Have you eaten a proper meal today?' },
                    { name: 'drankEnoughWater', label: 'Have you drank enough water?' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center space-x-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-50 transition cursor-pointer">
                      <input 
                        type="checkbox" 
                        id={item.name} 
                        name={item.name} 
                        checked={formData[item.name as keyof typeof formData] as boolean} 
                        onChange={handleChange} 
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" 
                      />
                      <label htmlFor={item.name} className="text-xs font-semibold text-gray-700 cursor-pointer w-full select-none">{item.label}</label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input 
                      required 
                      type="checkbox" 
                      name="doYouAgreeToMedicalReview" 
                      checked={formData.doYouAgreeToMedicalReview} 
                      onChange={handleChange} 
                      className="w-5 h-5 mt-0.5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer" 
                    />
                    <span className="text-xs font-semibold text-gray-800 leading-normal select-none">
                      I confirm that the information provided is accurate to the best of my knowledge. 
                      I agree to undergo a medical review before the final donation process.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Bottom Actions Row */}
            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" className="flex-1 h-12 text-md font-bold rounded-xl" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              
              {formData.role === "donor" && step < 3 ? (
                <Button type="button" className="flex-1 h-12 text-md font-bold rounded-xl" onClick={nextStep}>
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-md font-bold rounded-xl" 
                  disabled={loading || (formData.role === "donor" && !formData.doYouAgreeToMedicalReview)}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    formData.role === "donor" ? "Register & Check Eligibility ✓" : "Create Account"
                  )}
                </Button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
