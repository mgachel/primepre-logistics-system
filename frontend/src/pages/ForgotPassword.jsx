import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoHeader from "../components/LogoHeader";
import TextInput from "../components/TextInput";
import FormButton from "../components/FormButton";
import Footer from "../components/Footer";
import authService from "../services/authService";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      console.log("Sending password reset request to backend...");
      const response = await authService.requestPasswordReset(email);
      console.log("Password reset request successful:", response);
      setSuccess(true);
      
      // Navigate to verification page with email
      navigate("/verify-reset-code", { state: { email } });
    } catch (error) {
      console.error("Password reset request error:", error);
      
      // Check if the error response contains the deprecated endpoint message
      if (error.message && error.message.includes('deprecated')) {
        setError("The system is using an outdated API endpoint. Please contact support.");
      } else {
        // Show user-friendly message but log detailed error
        setError(error.message || "Failed to send reset code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <LogoHeader />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md p-8 w-full max-w-md"
      >
        <h2 className="text-center text-2xl font-semibold mb-2">Forgot Password</h2>
        <p className="text-center text-gray-600 mb-6">
          Enter your email address and we'll send you a verification code to reset your password.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Verification code sent to your email!
          </div>
        )}

        <TextInput
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={handleChange}
          placeholder="Enter your email address"
          required
        />

        <FormButton 
          label={loading ? "Sending..." : "Send Reset Code"} 
          disabled={loading} 
        />

        <div className="text-center mt-4">
          <a 
            href="/login" 
            className="text-blue-600 hover:underline text-sm"
          >
            Back to Login
          </a>
        </div>
      </form>

      <Footer />
    </div>
  );
}

export default ForgotPassword;
