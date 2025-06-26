import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LogoHeader from "../components/LogoHeader";
import TextInput from "../components/TextInput";
import FormButton from "../components/FormButton";
import Footer from "../components/Footer";
import authService from "../services/authService";

function VerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Extract email from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location.search]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !verificationCode) {
      setError("Email and verification code are required");
      return;
    }

    try {
      setLoading(true);
      await authService.verifyAccount(email, verificationCode);
      setSuccess("Account verified successfully!");
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Verification error:", error);
      setError(error.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Email is required to resend verification code");
      return;
    }

    try {
      setResending(true);
      await authService.resendVerificationCode(email);
      setSuccess("Verification code has been resent to your email");
    } catch (error) {
      console.error("Resend code error:", error);
      setError(error.message || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <LogoHeader />

      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
        <h2 className="text-center text-2xl font-semibold mb-6">Verify Your Account</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            disabled={!!location.search}
            required
          />

          <TextInput
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
          />

          <FormButton label={loading ? "Verifying..." : "Verify Account"} disabled={loading} />
          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="text-blue-600 text-sm hover:underline"
            >
              {resending ? "Sending..." : "Didn't receive code? Resend"}
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

export default VerificationPage;
