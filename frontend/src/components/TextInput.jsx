
function TextInput({ label, name, type = "text", value, onChange, placeholder, required = false }) {
  return (
    <div className="mb-3 sm:mb-4">
      <label className="block text-xs sm:text-sm text-gray-700 mb-1 sm:mb-2 font-medium">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        required={required}
      />
    </div>
  );
}

export default TextInput;
