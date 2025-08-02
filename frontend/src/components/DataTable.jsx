import React from "react";

const DataTable = ({
  data = [],
  columns = [],
  onRowAction,
  emptyMessage = "No data available",
}) => {
  const defaultColumns = [
    { key: "tracking_id", label: "TRACKING ID", width: "w-1/6" },
    { key: "shipping_mark", label: "SHIPPING MARK", width: "w-1/6" },
    { key: "description", label: "DESCRIPTION", width: "w-1/4" },
    { key: "status", label: "STATUS", width: "w-1/6" },
    { key: "added_by", label: "ADDED BY", width: "w-1/6" },
    { key: "actions", label: "ACTIONS", width: "w-1/12" },
  ];

  const tableColumns = columns.length > 0 ? columns : defaultColumns;

  const renderCell = (item, column) => {
    if (column.key === "actions") {
      return (
        <button
          onClick={() => onRowAction && onRowAction(item)}
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      );
    }

    if (column.key === "status") {
      const statusColor = {
        received: "bg-blue-100 text-blue-800",
        shipped: "bg-green-100 text-green-800",
        flagged: "bg-red-100 text-red-800",
        processing: "bg-yellow-100 text-yellow-800",
      };

      return (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            statusColor[item[column.key]] || "bg-gray-100 text-gray-800"
          }`}
        >
          {item[column.key]}
        </span>
      );
    }

    return item[column.key] || "-";
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Table Header */}
        <div className="bg-gray-50 rounded-t-lg">
          <div className="grid grid-cols-12 gap-4 px-6 py-3">
            {tableColumns.map((column) => (
              <div key={column.key} className={`${column.width} col-span-2`}>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {column.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50">
        <div className="grid grid-cols-12 gap-4 px-6 py-3">
          {tableColumns.map((column) => (
            <div key={column.key} className={`${column.width} col-span-2`}>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {column.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {data.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50"
          >
            {tableColumns.map((column) => (
              <div
                key={column.key}
                className={`${column.width} col-span-2 text-sm text-gray-900`}
              >
                {renderCell(item, column)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataTable;
