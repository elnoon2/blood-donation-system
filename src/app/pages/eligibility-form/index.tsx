import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import api from "../../../lib/api";

export const EligibilityForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "",
    weight: "",
    bloodType: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    address: "",
    lastDonationDate: "",
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
    doYouHaveLiverDisease: false,
    doYouHaveBloodDisorder: false,
    areYouTakingMedications: false,
    medicationDetails: "",
    didYouHaveRecentSurgery: false,
    surgeryDetails: "",
    areYouPregnantOrRecentlyPregnant: false,
    doYouSmoke: false,
    doYouHaveRecentTattooOrPiercing: false,
    doYouHaveRecentInfection: false,
    doYouHaveRecentBleeding: false,
    doYouFeelDizzyOrWeak: false,
    anyOtherMedicalCondition: "",
    sleptWellLastNight: false,
    ateBeforeDonation: false,
    drankEnoughWater: false,
    currentEnergyLevel: "Good",
    doYouAgreeToMedicalReview: false,
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.age || !formData.weight || !formData.bloodType || !formData.phone || !formData.governorate) {
        setError("Please fill in all the required basic information (Name, Age, Weight, Blood Type, Phone, Governorate).");
        return;
      }
      const parsedAge = parseInt(formData.age);
      const parsedWeight = parseFloat(formData.weight);
      if (isNaN(parsedAge) || isNaN(parsedWeight) || parsedAge <= 0 || parsedWeight <= 0) {
        setError("Please enter valid age and weight.");
        return;
      }
    }
    setError("");
    setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight)
      };

      const response = await api.post("/donor-eligibility/check", payload);
      navigate("/eligibility-result", { state: { result: response.data, requestId } });
    } catch (err) {
      console.error(err);
      setError("Failed to submit assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-red-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white text-center">Donor Eligibility Assessment</h2>
          <p className="text-red-100 text-center mt-1">Step {step} of 3</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="px-8 pt-6 pb-8 mb-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
                  <input required name="fullName" value={formData.fullName} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Age</label>
                  <input required type="number" name="age" value={formData.age} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Weight (kg)</label>
                  <input required type="number" name="weight" value={formData.weight} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Blood Type</label>
                  <select name="bloodType" value={formData.bloodType} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Governorate</label>
                  <input name="governorate" value={formData.governorate} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">City</label>
                  <input name="city" value={formData.city} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Last Donation Date</label>
                  <input type="date" name="lastDonationDate" value={formData.lastDonationDate} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button type="button" onClick={nextStep} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-200">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Health Questions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div key={item.name} className="flex items-center space-x-3 p-3 bg-gray-50 rounded border hover:bg-gray-100 transition">
                    <input type="checkbox" id={item.name} name={item.name} checked={formData[item.name as keyof typeof formData] as boolean} onChange={handleChange} className="w-5 h-5 text-red-600 rounded focus:ring-red-500" />
                    <label htmlFor={item.name} className="text-sm font-medium text-gray-700 cursor-pointer w-full">{item.label}</label>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded border mb-2">
                  <input type="checkbox" name="doYouHaveChronicDisease" checked={formData.doYouHaveChronicDisease} onChange={handleChange} className="w-5 h-5 text-red-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Do you have any chronic disease?</span>
                </label>
                {formData.doYouHaveChronicDisease && (
                  <input placeholder="Please specify..." name="chronicDiseaseDetails" value={formData.chronicDiseaseDetails} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 ml-8 md:w-3/4" />
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={prevStep} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded focus:outline-none transition duration-200">
                  Back
                </button>
                <button type="button" onClick={nextStep} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none transition duration-200">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Lifestyle & Consent</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'sleptWellLastNight', label: 'Did you sleep well last night?' },
                  { name: 'ateBeforeDonation', label: 'Have you eaten a proper meal today?' },
                  { name: 'drankEnoughWater', label: 'Have you drank enough water?' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center space-x-3 p-3 bg-gray-50 rounded border hover:bg-gray-100 transition">
                    <input type="checkbox" id={item.name} name={item.name} checked={formData[item.name as keyof typeof formData] as boolean} onChange={handleChange} className="w-5 h-5 text-red-600 rounded focus:ring-red-500" />
                    <label htmlFor={item.name} className="text-sm font-medium text-gray-700 cursor-pointer w-full">{item.label}</label>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <label className="flex items-start space-x-3">
                  <input required type="checkbox" name="doYouAgreeToMedicalReview" checked={formData.doYouAgreeToMedicalReview} onChange={handleChange} className="w-5 h-5 mt-1 text-red-600 rounded focus:ring-red-500" />
                  <span className="text-sm font-medium text-gray-800">
                    I confirm that the information provided is accurate to the best of my knowledge. 
                    I agree to undergo a medical review before the final donation process.
                  </span>
                </label>
              </div>

              <div className="flex justify-between mt-8">
                <button type="button" onClick={prevStep} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded focus:outline-none transition duration-200">
                  Back
                </button>
                <button onClick={handleSubmit} disabled={loading || !formData.doYouAgreeToMedicalReview} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded focus:outline-none transition duration-200 disabled:opacity-50">
                  {loading ? 'Submitting...' : 'Submit Assessment'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
