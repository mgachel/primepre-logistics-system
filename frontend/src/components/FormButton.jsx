function FormButton({ label, disabled = false }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 rounded-md text-sm sm:text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {label}
    </button>
  );
}

export default FormButton;
