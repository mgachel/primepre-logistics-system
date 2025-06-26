
function TextInput({ label, name, type = "text", value, onChange, placeholder }) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
    </div>
  );
}

export default TextInput;
