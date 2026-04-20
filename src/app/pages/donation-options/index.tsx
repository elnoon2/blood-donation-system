import { useState } from "react";
import { useNavigate } from "react-router";
import { Hospital, Home, Heart, UserPlus } from "lucide-react";

export const DonationOptions = () => {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState("");
  const [method, setMethod] = useState("");

  const handleContinue = () => {
    if (method === "HOME") {
      navigate("/home-collection-form", { state: { purpose } });
    } else if (method === "HOSPITAL") {
      if (purpose === "PATIENT") {
        navigate("/search-donors"); // existing page to search and choose patients/requests
      } else {
        navigate("/dashboard"); // or map to hospital listing to go donate
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8 border-b pb-4">Select Donation Options</h2>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">1. Select Donation Purpose</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setPurpose("PATIENT")}
              className={`cursor-pointer border-2 rounded-lg p-6 flex flex-col items-center justify-center transition-all ${purpose === "PATIENT" ? "border-red-500 bg-red-50 text-red-700 shadow" : "border-gray-200 hover:border-red-300 text-gray-600"}`}
            >
              <UserPlus className={`w-12 h-12 mb-3 ${purpose === "PATIENT" ? "text-red-500" : "text-gray-400"}`} />
              <span className="font-semibold text-center">Donate for a Patient Request</span>
            </div>
            <div 
              onClick={() => setPurpose("GENERAL")}
              className={`cursor-pointer border-2 rounded-lg p-6 flex flex-col items-center justify-center transition-all ${purpose === "GENERAL" ? "border-red-500 bg-red-50 text-red-700 shadow" : "border-gray-200 hover:border-red-300 text-gray-600"}`}
            >
              <Heart className={`w-12 h-12 mb-3 ${purpose === "GENERAL" ? "text-red-500" : "text-gray-400"}`} />
              <span className="font-semibold text-center">General Voluntary Donation</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">2. Select Donation Method</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setMethod("HOSPITAL")}
              className={`cursor-pointer border-2 rounded-lg p-6 flex flex-col items-center justify-center transition-all ${method === "HOSPITAL" ? "border-blue-500 bg-blue-50 text-blue-700 shadow" : "border-gray-200 hover:border-blue-300 text-gray-600"}`}
            >
              <Hospital className={`w-12 h-12 mb-3 ${method === "HOSPITAL" ? "text-blue-500" : "text-gray-400"}`} />
              <span className="font-semibold text-center">Hospital Donation</span>
            </div>
            <div 
              onClick={() => setMethod("HOME")}
              className={`cursor-pointer border-2 rounded-lg p-6 flex flex-col items-center justify-center transition-all ${method === "HOME" ? "border-blue-500 bg-blue-50 text-blue-700 shadow" : "border-gray-200 hover:border-blue-300 text-gray-600"}`}
            >
              <Home className={`w-12 h-12 mb-3 ${method === "HOME" ? "text-blue-500" : "text-gray-400"}`} />
              <span className="font-semibold text-center">Home Blood Collection Visit</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800 font-medium">
            Go Back
          </button>
          <button 
            onClick={handleContinue}
            disabled={!purpose || !method}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded shadow transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
