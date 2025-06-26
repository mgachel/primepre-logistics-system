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
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    region: "",
    companyName: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // Map formData to match backend field names
      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        region: formData.region,
        company_name: formData.companyName || null, // Optional field
        role: formData.role,
        password: formData.password,
        confirmPassword: formData.confirmPassword, // Will be converted to password2 in authService
      };

      await authService.register(userData);

      // Redirect to verification page with email
      navigate(`/verify?email=${encodeURIComponent(formData.email)}`);
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

        <TextInput
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          placeholder="Enter your first name"
        />

        <TextInput
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          placeholder="Enter your last name"
        />

        <TextInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="example@mail.com"
        />

        <TextInput
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="000-0000-000"
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
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          placeholder="Prime Logistics Ltd."
        />

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select role</option>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
            <option value="Customer">Customer</option>
          </select>
        </div>

        <PasswordInput
          label="Create password"
          name="password"
          value={formData.password}
          onChange={handleChange}
        />

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
        />

        <FormButton label={loading ? "Signing up..." : "Sign up"} disabled={loading} />

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
