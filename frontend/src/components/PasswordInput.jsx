function PasswordInput({ label, name, value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input
        type="password"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
    </div>
  );
}

export default PasswordInput;
