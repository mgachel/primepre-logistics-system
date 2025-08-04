import React from "react";

const StatusCard = ({
  title,
  count,
  icon,
  backgroundColor = "bg-blue-100",
  textColor = "text-blue-600",
  countTextColor = "text-blue-900",
  borderColor = "border-blue-200",
}) => {
  return (
    <div className={`${backgroundColor} rounded-lg p-4 ${borderColor} border`}>
      <div className="flex items-center">
        <div
          className={`w-10 h-10 ${backgroundColor} rounded-full flex items-center justify-center mr-3`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{title}</p>
          <p className={`text-2xl font-bold ${countTextColor}`}>{count}</p>
          <p className={`text-xs ${textColor}`}>Items</p>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
