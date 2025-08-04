import React, { useState, useMemo } from "react";

const DataTable = ({
  data = [],
  columns = [],
  onRowAction,
  onUpdate,
  onDelete,
  onUpdateStatus,
  emptyMessage = "No data available",
  userRole = "customer",
  itemsPerPage = 25, // Show 25 items per page by default
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const defaultColumns = [
    { key: "tracking_id", label: "TRACKING ID", width: "w-1/6" },
    { key: "shipping_mark", label: "SHIPPING MARK", width: "w-1/6" },
    { key: "description", label: "DESCRIPTION", width: "w-1/4" },
    { key: "status", label: "STATUS", width: "w-1/6" },
    { key: "added_by", label: "ADDED BY", width: "w-1/6" },
    { key: "actions", label: "ACTIONS", width: "w-1/8" },
  ];

  const tableColumns = columns.length > 0 ? columns : defaultColumns;

  // Calculate pagination
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const renderCell = (item, column) => {
    if (column.key === "actions") {
      const isStaffUser =
        userRole === "staff" ||
        userRole === "admin" ||
        userRole === "manager" ||
        userRole === "super_admin";

      return (
        <div className="flex items-center space-x-2">
          {/* View Details Button */}
          <button
            onClick={() => onRowAction && onRowAction(item)}
            className="inline-flex items-center justify-center w-8 h-8 text-blue-600 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="View Details"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          {isStaffUser && (
            <>
              {/* Update Item Button */}
              <button
                onClick={() => onUpdate && onUpdate(item)}
                className="inline-flex items-center justify-center w-8 h-8 text-green-600 bg-green-100 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Update Item"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>

              {/* Update Status Button */}
              <button
                onClick={() => onUpdateStatus && onUpdateStatus(item)}
                className="inline-flex items-center justify-center w-8 h-8 text-purple-600 bg-purple-100 rounded hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                title="Update Status"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Delete Item Button */}
              <button
                onClick={() => onDelete && onDelete(item)}
                className="inline-flex items-center justify-center w-8 h-8 text-red-600 bg-red-100 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Delete Item"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      );
    }

    if (column.key === "status") {
      const statusColor = {
        pending: "bg-yellow-100 text-yellow-800",
        ready_for_shipping: "bg-blue-100 text-blue-800",
        shipped: "bg-green-100 text-green-800",
        flagged: "bg-red-100 text-red-800",
        cancelled: "bg-gray-100 text-gray-800",
        // Ghana warehouse statuses
        ready_for_delivery: "bg-blue-100 text-blue-800",
        delivered: "bg-green-100 text-green-800",
        // Legacy mappings for compatibility
        received: "bg-blue-100 text-blue-800",
        processing: "bg-yellow-100 text-yellow-800",
      };

      const displayStatus = {
        pending: "Pending",
        ready_for_shipping: "Ready to Ship",
        shipped: "Shipped",
        flagged: "Flagged",
        cancelled: "Cancelled",
        // Ghana warehouse statuses
        ready_for_delivery: "Ready for Delivery",
        delivered: "Delivered",
        // Legacy mappings
        received: "Received",
        processing: "Processing",
      };

      const status = item[column.key]?.toLowerCase() || "pending";

      return (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            statusColor[status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {displayStatus[status] || status}
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
        {currentData.map((item, index) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            {/* Left side - Item count info */}
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
              {totalItems} items
            </div>

            {/* Right side - Page navigation */}
            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {/* Show first page if not in view */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      1
                    </button>
                    {currentPage > 4 && (
                      <span className="text-gray-500">...</span>
                    )}
                  </>
                )}

                {/* Show pages around current page */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          pageNum === currentPage
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                }).filter(Boolean)}

                {/* Show last page if not in view */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <span className="text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Next button */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
