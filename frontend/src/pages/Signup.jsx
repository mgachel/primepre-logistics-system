import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoHeader from "../components/LogoHeader";
import TextInput from "../components/TextInput";
import PasswordInput from "../components/PasswordInput";
import FormButton from "../components/FormButton";
import Footer from "../components/Footer";
import authService from "../services/authService";

function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    region: "",
    company_name: "",
    user_type: "INDIVIDUAL",
    user_role: "CUSTOMER",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    common: true
  });

  // Common weak passwords list
  const commonPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
    'admin', 'admin123', 'test', 'test123', 'user', 'user123', 'welcome',
    'welcome123', 'login', 'login123', 'pass', 'pass123', '111111', '000000'
  ];

  const validatePassword = (password) => {
    const strength = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      common: !commonPasswords.includes(password.toLowerCase())
    };
    setPasswordStrength(strength);
    return strength;
  };

  const getPasswordErrors = (password) => {
    const errors = [];
    if (password.length > 0 && password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (password.length > 0 && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (password.length > 0 && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (password.length > 0 && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (password.length > 0 && commonPasswords.includes(password.toLowerCase())) {
      errors.push("This password is too common. Please choose a more secure password");
    }
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Real-time password validation
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.phone || !formData.region || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    // Password validation with specific error messages
    const passwordErrors = getPasswordErrors(formData.password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]); // Show the first error
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      console.log('Form data being submitted:', formData);
      await authService.register(formData);

      // Store phone for verification page
      sessionStorage.setItem("registrationPhone", formData.phone);

      // Show success message and redirect to dashboard
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || "Registration failed. Please try again.");
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
        <h2 className="text-center text-2xl font-semibold mb-6">Sign up</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Registration successful! Welcome to PrimePre Logistics. Redirecting to dashboard...
          </div>
        )}

        <TextInput
          label="First Name"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          placeholder="Enter your first name"
          required
        />

        <TextInput
          label="Last Name"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          placeholder="Enter your last name"
          required
        />

        <TextInput
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="e.g., 0244123456"
          required
        />

        <TextInput
          label="Email (Optional)"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="example@mail.com"
        />

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Region</label>
          <select
            name="region"
            value={formData.region}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select region</option>
            <option value="Accra">Accra</option>
            <option value="Kumasi">Kumasi</option>
            <option value="Tamale">Tamale</option>
          </select>
        </div>

        <TextInput
          label="Company Name (optional)"
          name="company_name"
          value={formData.company_name}
          onChange={handleChange}
          placeholder="Prime Logistics Ltd."
        />

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">User Type</label>
          <select
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>

        <PasswordInput
          label="Create password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className="mb-4 text-sm">
          <p className="font-medium mb-2 text-gray-700">Password requirements:</p>
          <ul className="space-y-1">
            <li className={`flex items-center ${passwordStrength.length ? 'text-green-600' : 'text-red-500'}`}>
              <span className="mr-2">{passwordStrength.length ? '✓' : '✗'}</span>
              At least 8 characters long
            </li>
            <li className={`flex items-center ${passwordStrength.uppercase ? 'text-green-600' : 'text-red-500'}`}>
              <span className="mr-2">{passwordStrength.uppercase ? '✓' : '✗'}</span>
              At least one uppercase letter (A-Z)
            </li>
            <li className={`flex items-center ${passwordStrength.lowercase ? 'text-green-600' : 'text-red-500'}`}>
              <span className="mr-2">{passwordStrength.lowercase ? '✓' : '✗'}</span>
              At least one lowercase letter (a-z)
            </li>
            <li className={`flex items-center ${passwordStrength.number ? 'text-green-600' : 'text-red-500'}`}>
              <span className="mr-2">{passwordStrength.number ? '✓' : '✗'}</span>
              At least one number (0-9)
            </li>
            <li className={`flex items-center ${passwordStrength.common ? 'text-green-600' : 'text-red-500'}`}>
              <span className="mr-2">{passwordStrength.common ? '✓' : '✗'}</span>
              Not a common password
            </li>
          </ul>
          
          {formData.password && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Password strength:</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    Object.values(passwordStrength).filter(Boolean).length === 5 
                      ? 'bg-green-500 w-full' 
                      : Object.values(passwordStrength).filter(Boolean).length >= 3
                      ? 'bg-yellow-500 w-3/5'
                      : 'bg-red-500 w-2/5'
                  }`}
                ></div>
              </div>
              <div className="text-xs mt-1">
                {Object.values(passwordStrength).filter(Boolean).length === 5 && (
                  <span className="text-green-600 font-medium">Strong password!</span>
                )}
                {Object.values(passwordStrength).filter(Boolean).length >= 3 && Object.values(passwordStrength).filter(Boolean).length < 5 && (
                  <span className="text-yellow-600">Moderate strength</span>
                )}
                {Object.values(passwordStrength).filter(Boolean).length < 3 && formData.password && (
                  <span className="text-red-600">Weak password</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-blue-800 mb-1">💡 Password Tips:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Use a mix of personal words + numbers (e.g., "MyDog2025!")</li>
            <li>• Replace letters with numbers (e.g., "H0us3Number123")</li>
            <li>• Combine unrelated words (e.g., "Coffee7Table")</li>
          </ul>
        </div>

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        {formData.confirmPassword && (
          <div className="mb-4 text-sm">
            {formData.password === formData.confirmPassword ? (
              <div className="flex items-center text-green-600">
                <span className="mr-2">✓</span>
                Passwords match
              </div>
            ) : (
              <div className="flex items-center text-red-500">
                <span className="mr-2">✗</span>
                Passwords do not match
              </div>
            )}
          </div>
        )}

        <FormButton
          label={loading ? "Signing up..." : "Sign up"}
          disabled={loading || !Object.values(passwordStrength).every(Boolean) || formData.password !== formData.confirmPassword}
        />

        <div className="text-sm text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600">
            Click here
          </a>
        </div>
      </form>

      <Footer />
    </div>
  );
}

export default SignUp;
