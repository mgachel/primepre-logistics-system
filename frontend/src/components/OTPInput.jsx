import { useState, useRef, useEffect } from "react";

function OTPInput({ value, onChange, length = 6, disabled = false }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (value) {
      const otpArray = value.split("").slice(0, length);
      const paddedArray = [...otpArray, ...new Array(length - otpArray.length).fill("")];
      setOtp(paddedArray);
    }
  }, [value, length]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Call parent onChange
    onChange({ target: { value: newOtp.join("") } });

    // Focus next input
    if (element.value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const pastedArray = pastedData.slice(0, length).split("");
    
    if (pastedArray.every(char => !isNaN(char))) {
      const newOtp = [...pastedArray, ...new Array(length - pastedArray.length).fill("")];
      setOtp(newOtp);
      onChange({ target: { value: pastedArray.join("") } });
      
      // Focus the last filled input or first empty one
      const focusIndex = Math.min(pastedArray.length, length - 1);
      inputRefs.current[focusIndex].focus();
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Verification Code
      </label>
      <div className="flex justify-center space-x-2">
        {otp.map((data, index) => (
          <input
            key={index}
            type="text"
            maxLength="1"
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            ref={(ref) => (inputRefs.current[index] = ref)}
            disabled={disabled}
            className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              disabled 
                ? "bg-gray-100 border-gray-300" 
                : "border-gray-300 hover:border-gray-400"
            }`}
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  );
}

export default OTPInput;
