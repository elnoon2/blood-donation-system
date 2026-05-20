import { useLocation, useNavigate } from "react-router";
import { AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import api from "../../../lib/api";
import { toast } from "sonner";

export const EligibilityResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const requestId = location.state?.requestId;

  const handleAcceptRequest = async () => {
    try {
      await api.post(`/requests/${requestId}/accept`);
      toast.success("Request Accepted", {
        description: "You have successfully accepted the request after proving your eligibility."
      });
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to accept request.");
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No result found.</p>
          <button onClick={() => navigate('/eligibility-form')} className="text-red-600 hover:underline">
            Go to Assessment
          </button>
        </div>
      </div>
    );
  }

  const { eligibilityResult, explanation, recommendation } = result;

  const getResultUI = () => {
    switch (eligibilityResult) {
      case "ELIGIBLE":
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />,
          color: "text-green-700",
          bg: "bg-green-50",
          title: "Eligible"
        };
      case "TEMPORARILY_INELIGIBLE":
        return {
          icon: <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />,
          color: "text-yellow-700",
          bg: "bg-yellow-50",
          title: "Temporarily Not Eligible"
        };
      case "NEEDS_REVIEW":
        return {
          icon: <Info className="w-16 h-16 text-blue-500 mx-auto mb-4" />,
          color: "text-blue-700",
          bg: "bg-blue-50",
          title: "Needs Doctor Review"
        };
      case "INELIGIBLE":
      default:
        return {
          icon: <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />,
          color: "text-red-700",
          bg: "bg-red-50",
          title: "Not Eligible"
        };
    }
  };

  const ui = getResultUI();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        {/* IMPORTANT MEDICAL DISCLAIMER */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 m-4 mt-6 rounded">
          <div className="flex">
            <div className="w-full">
              <h3 className="text-red-800 font-bold text-lg mb-2 text-center border-b border-red-200 pb-2">
                MEDICAL DISCLAIMER / تنبيه طبي
              </h3>
              <p className="text-red-700 text-sm md:text-base font-semibold text-center mb-3 leading-relaxed" dir="rtl">
                تنبيه هام: هذا التقييم هو تقييم مبدئي فقط، ولا يُعتبر موافقة طبية نهائية على التبرع بالدم. القرار النهائي يجب أن يتم بعد مراجعة الطبيب أو الفريق الطبي المختص.
              </p>
              <p className="text-red-700 text-sm md:text-base font-semibold text-center leading-relaxed">
                Important Notice: This assessment is preliminary only and does NOT represent a final medical approval for blood donation. Final approval must be made by a qualified doctor or medical team.
              </p>
            </div>
          </div>
        </div>

        <div className={`p-8 text-center ${ui.bg} border-b`}>
          {ui.icon}
          <h2 className={`text-3xl font-bold ${ui.color} mb-2`}>{ui.title}</h2>
          <p className="text-gray-700 text-lg mt-4">{explanation}</p>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-800 border-b pb-2">Recommendation</h3>
          <p className="text-gray-600 mb-8">{recommendation}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {eligibilityResult === "ELIGIBLE" || eligibilityResult === "NEEDS_REVIEW" ? (
              requestId ? (
                <button onClick={handleAcceptRequest} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded shadow transition duration-200">
                  Accept Patient Request & Go to Hospital
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => navigate('/donation-options')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded shadow transition duration-200">
                    Proceed to Donation Options
                  </button>
                  <button onClick={() => navigate('/dashboard')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded shadow transition duration-200">
                    Continue to Dashboard/Home
                  </button>
                </div>
              )
            ) : (
              <button onClick={() => navigate('/dashboard')} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded shadow transition duration-200">
                Back to Home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
