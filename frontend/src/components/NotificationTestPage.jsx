import React, { useState } from "react";
import NotificationToast from "./NotificationToast";

const NotificationTestPage = () => {
  const [notification, setNotification] = useState({
    show: false,
    type: "info",
    title: "",
    message: "",
  });

  const showNotification = (type, title, message) => {
    setNotification({
      show: true,
      type,
      title,
      message,
    });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Notification Test</h1>

      <NotificationToast
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={closeNotification}
      />

      <div className="space-x-4">
        <button
          onClick={() =>
            showNotification("success", "Success!", "This is a success message")
          }
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Test Success
        </button>

        <button
          onClick={() =>
            showNotification(
              "error",
              "Error!",
              "This is an error message with tracking ID already exists"
            )
          }
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Test Error
        </button>

        <button
          onClick={() =>
            showNotification("warning", "Warning!", "This is a warning message")
          }
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Test Warning
        </button>

        <button
          onClick={() =>
            showNotification("info", "Info!", "This is an info message")
          }
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Info
        </button>
      </div>
    </div>
  );
};

export default NotificationTestPage;
