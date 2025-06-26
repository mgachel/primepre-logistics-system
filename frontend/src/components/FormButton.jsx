function FormButton({ label }) {
  return (
    <button
      type="submit"
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold"
    >
      {label}
    </button>
  );
}

export default FormButton;
