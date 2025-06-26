function SwitchInputType({ useEmail, toggle }) {
  return (
    <p
      onClick={toggle}
      className="text-sm text-blue-600 text-right cursor-pointer mb-4"
    >
      {useEmail ? "Use phone instead" : "Use email instead"}
    </p>
  );
}

export default SwitchInputType;
