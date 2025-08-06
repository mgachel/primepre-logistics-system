import React, { useEffect, useState } from "react";

const NotificationToast = ({
  show,
  onClose,
  type = "info",
  title,
  message,
  autoClose = true,
  duration = 4000, // Increased from 5000 to 4000 for faster feedback
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (show && autoClose) {
      setProgress(100);

      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - 100 / (duration / 100);
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [show, autoClose, duration, onClose]);

  if (!show) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          container: "bg-green-50 border-green-200",
          icon: "text-green-600",
          iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
          title: "text-green-800",
          message: "text-green-700",
        };
      case "error":
        return {
          container: "bg-red-50 border-red-200",
          icon: "text-red-600",
          iconPath:
            "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
          title: "text-red-800",
          message: "text-red-700",
        };
      case "warning":
        return {
          container: "bg-yellow-50 border-yellow-200",
          icon: "text-yellow-600",
          iconPath:
            "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z",
          title: "text-yellow-800",
          message: "text-yellow-700",
        };
      default: // info
        return {
          container: "bg-blue-50 border-blue-200",
          icon: "text-blue-600",
          iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
          title: "text-blue-800",
          message: "text-blue-700",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
      <div
        className={`rounded-lg border p-4 shadow-lg ${styles.container} animate-slideIn`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className={`h-6 w-6 ${styles.icon}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={styles.iconPath}
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
            )}
            <div className={`text-sm ${styles.message} ${title ? "mt-1" : ""}`}>
              {message}
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              className={`inline-flex rounded-md ${styles.container} text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {autoClose && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-100 ease-linear ${
                  type === "success"
                    ? "bg-green-600"
                    : type === "error"
                    ? "bg-red-600"
                    : type === "warning"
                    ? "bg-yellow-600"
                    : "bg-blue-600"
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationToast;
