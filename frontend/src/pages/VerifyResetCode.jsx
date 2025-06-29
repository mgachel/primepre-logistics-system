import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LogoHeader from "../components/LogoHeader";
import TextInput from "../components/TextInput";
import OTPInput from "../components/OTPInput";
import FormButton from "../components/FormButton";
import Footer from "../components/Footer";
import authService from "../services/authService";

function VerifyResetCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    code: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get email from navigation state
    if (location.state?.email) {
      setFormData(prev => ({ ...prev, email: location.state.email }));
    } else {
      // If no email in state, redirect to forgot password
      navigate("/forgot-password");
    }
  }, [location.state, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleOTPChange = (e) => {
    setFormData({
      ...formData,
      code: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.code) {
      setError("Please enter the verification code");
      return;
    }

    if (formData.code.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    try {
      setLoading(true);
      const response = await authService.verifyResetCode(formData.email, formData.code);
      console.log("Code verification successful:", response);
      
      // Navigate to reset password page with email and code
      navigate("/reset-password", { 
        state: { 
          email: formData.email, 
          code: formData.code 
        } 
      });
    } catch (error) {
      console.error("Code verification error:", error);
      setError(error.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.requestPasswordReset(formData.email);
      alert("New verification code sent to your email!");
    } catch (error) {
      setError(error.message || "Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <LogoHeader />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md p-8 w-full max-w-md"
      >
        <h2 className="text-center text-2xl font-semibold mb-2">Verify Reset Code</h2>
        <p className="text-center text-gray-600 mb-6">
          Enter the 6-digit verification code sent to your email address.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <TextInput
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Your email address"
          disabled
          className="bg-gray-100"
        />

        <OTPInput
          value={formData.code}
          onChange={handleOTPChange}
          length={6}
          disabled={loading}
        />

        <FormButton 
          label={loading ? "Verifying..." : "Verify Code"} 
          disabled={loading} 
        />

        <div className="text-center mt-4 space-y-2">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="text-blue-600 hover:underline text-sm disabled:text-gray-400"
          >
            Resend Code
          </button>
          <br />
          <a 
            href="/forgot-password" 
            className="text-blue-600 hover:underline text-sm"
          >
            Back to Forgot Password
          </a>
        </div>
      </form>

      <Footer />
    </div>
  );
}

export default VerifyResetCode;
