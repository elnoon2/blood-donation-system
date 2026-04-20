import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import api from "../../../lib/api";

export const HomeCollectionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    fullAddress: "",
    governorate: "",
    city: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    reasonForHomeCollection: "",
    medicalNotes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/home-collection-request/create", formData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
      
    } catch (err) {
      console.error(err);
      setError("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted</h2>
          <p className="text-gray-600 mb-4">Your home collection request has been submitted successfully and is pending review.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white text-center">Home Blood Collection Request</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8 mb-4">
          
          {/* IMPORTANT MEDICAL DISCLAIMER */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <h3 className="text-red-800 font-bold mb-1">MEDICAL DISCLAIMER / تنبيه طبي</h3>
            <p className="text-red-700 text-sm font-semibold mb-2" dir="rtl">
              تنبيه هام: هذا التقييم هو تقييم مبدئي فقط، ولا يُعتبر موافقة طبية نهائية على التبرع بالدم. القرار النهائي يجب أن يتم بعد مراجعة الطبيب أو الفريق الطبي المختص.
            </p>
            <p className="text-red-700 text-sm font-semibold">
              Important Notice: This assessment is preliminary only and does NOT represent a final medical approval for blood donation. Final approval must be made by a qualified doctor or medical team.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">Full Address</label>
              <input required name="fullAddress" value={formData.fullAddress} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Governorate</label>
              <input required name="governorate" value={formData.governorate} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">City</label>
              <input required name="city" value={formData.city} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Phone</label>
              <input required name="phone" value={formData.phone} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Preferred Date</label>
              <input required type="date" name="preferredDate" value={formData.preferredDate} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" min={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">Preferred Time</label>
              <select required name="preferredTime" value={formData.preferredTime} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a time block</option>
                <option value="Morning (09:00 AM - 12:00 PM)">Morning (09:00 AM - 12:00 PM)</option>
                <option value="Afternoon (12:00 PM - 04:00 PM)">Afternoon (12:00 PM - 04:00 PM)</option>
                <option value="Evening (04:00 PM - 08:00 PM)">Evening (04:00 PM - 08:00 PM)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">Reason for Home Collection</label>
              <select required name="reasonForHomeCollection" value={formData.reasonForHomeCollection} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a reason</option>
                <option value="Cannot Travel">Cannot Travel</option>
                <option value="Elderly">Elderly</option>
                <option value="Doctor Recommendation">Doctor Recommendation</option>
                <option value="Health Condition">Health Condition</option>
                <option value="Emergency">Emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">Additional Medical Notes</label>
              <textarea name="medicalNotes" value={formData.medicalNotes} onChange={handleChange} rows={3} placeholder="Any specific requirements..." className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button type="button" onClick={() => navigate(-1)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded focus:outline-none transition duration-200">
              Back
            </button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded focus:outline-none transition duration-200 disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
