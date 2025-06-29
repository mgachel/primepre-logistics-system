import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LogoHeader from "../components/LogoHeader";
import PasswordInput from "../components/PasswordInput";
import FormButton from "../components/FormButton";
import Footer from "../components/Footer";
import SuccessNotification from "../components/SuccessNotification";
import authService from "../services/authService";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Get email and code from navigation state
    if (location.state?.email && location.state?.code) {
      setFormData(prev => ({ 
        ...prev, 
        email: location.state.email,
        code: location.state.code 
      }));
    } else {
      // If no email or code in state, redirect to forgot password
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

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check password confirmation
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const response = await authService.confirmPasswordReset(
        formData.email, 
        formData.code, 
        formData.newPassword
      );
      console.log("Password reset successful:", response);
      
      // Show success message and redirect to login
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Password reset error:", error);
      setError(error.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <SuccessNotification 
        message="Password reset successfully! Redirecting to login..."
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
      
      <LogoHeader />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md p-8 w-full max-w-md"
      >
        <h2 className="text-center text-2xl font-semibold mb-2">Reset Password</h2>
        <p className="text-center text-gray-600 mb-6">
          Enter your new password below.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <PasswordInput
          label="New Password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Enter new password"
          required
        />

        <PasswordInput
          label="Confirm New Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm new password"
          required
        />

        <div className="mb-4 text-sm text-gray-600">
          <p className="font-medium mb-1">Password requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>At least 8 characters long</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
          </ul>
        </div>

        <FormButton 
          label={loading ? "Resetting..." : "Reset Password"} 
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

export default ResetPassword;
