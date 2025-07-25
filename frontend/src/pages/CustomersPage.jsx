import { useState, useEffect } from "react";
import { customersService } from "../services/customersService";

function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [customerStats, setCustomerStats] = useState({
    total_users: 0,
    active_users: 0,
    customer_users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, sortBy]);

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, [currentPage, sortBy, debouncedSearchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch customer statistics
  useEffect(() => {
    fetchCustomerStats();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
        ordering: getOrderingParam(sortBy),
      };

      const response = await customersService.getCustomers(params);

      if (response.results) {
        setCustomers(response.results);
        setTotalCustomers(response.count || response.results.length);

        // If current page is invalid (empty results but total > 0), go to page 1
        if (
          response.results.length === 0 &&
          (response.count || 0) > 0 &&
          currentPage > 1
        ) {
          setCurrentPage(1);
          return; // This will trigger another fetch with page 1
        }
      }
    } catch (err) {
      // Handle specific pagination errors
      if (err.message.includes("Invalid page") || err.message.includes("404")) {
        if (currentPage > 1) {
          // Reset to page 1 if the current page is invalid
          setCurrentPage(1);
          setError("Page not found. Redirected to first page.");
          return;
        }
      }
      setError(err.message);
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      const stats = await customersService.getCustomerStats();
      setCustomerStats(stats);
    } catch (err) {
      console.error("Error fetching customer stats:", err);
    }
  };

  const getOrderingParam = (sortBy) => {
    switch (sortBy) {
      case "newest":
        return "-date_joined";
      case "oldest":
        return "date_joined";
      case "name":
        return "first_name";
      default:
        return "-date_joined";
    }
  };

  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const startIndex = (currentPage - 1) * pageSize;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(customers.map((customer) => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter((id) => id !== customerId));
    }
  };

  // ...existing code...

  // Popup state
  const [popup, setPopup] = useState({ type: null, customer: null });
  const [messageText, setMessageText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Popup handlers
  const openPopup = (type, customer) => setPopup({ type, customer });
  const closePopup = () => {
    setPopup({ type: null, customer: null });
    setMessageText("");
  };

  // Send message action
  const handleSendMessage = async () => {
    if (!popup.customer || !popup.customer.id || !messageText.trim()) return;
    setActionLoading(true);
    try {
      await customersService.sendMessageToCustomer(
        popup.customer.id,
        messageText
      );
      closePopup();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // View details action

  // Delete customer action
  const handleDeleteCustomer = async () => {
    if (!popup.customer || !popup.customer.id) return;
    setActionLoading(true);
    try {
      await customersService.deleteCustomer(popup.customer.id);
      fetchCustomers();
      closePopup();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Block/unblock action
  const handleToggleStatus = async () => {
    if (!popup.customer || !popup.customer.id) return;
    setActionLoading(true);
    try {
      await customersService.toggleCustomerStatus(popup.customer.id);
      fetchCustomers();
      closePopup();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="flex justify-center items-center h-48 md:h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mb-4"></div>
              <div className="text-base md:text-lg text-gray-600">
                Loading customers...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="flex justify-center items-center h-48 md:h-64">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg
                  className="w-12 h-12 md:w-16 md:h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="text-base md:text-lg text-gray-900 mb-2">
                Error Loading Customers
              </div>
              <div className="text-sm md:text-base text-gray-600 mb-4">
                {error}
              </div>
              <button
                onClick={fetchCustomers}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 md:px-6 md:py-3 rounded-md text-sm md:text-base font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6 max-w-full mx-auto overflow-hidden">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Customer Management
            </h1>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search customers..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Total Customers */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 md:p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs md:text-sm text-blue-600 font-medium mb-1">
                    Total Customers
                  </div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-900">
                    {customerStats.customer_users?.toLocaleString() || "0"}
                  </div>
                  <div className="text-xs md:text-sm text-green-600 font-medium mt-1">
                    ↑ 16% this month
                  </div>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-200 rounded-full flex items-center justify-center ml-4">
                  <svg
                    className="w-6 h-6 md:w-8 md:h-8 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Customers */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 md:p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs md:text-sm text-green-600 font-medium mb-1">
                    Active Customers
                  </div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold text-green-900">
                    {customerStats.active_customer_users?.toLocaleString() ||
                      "0"}
                  </div>
                  <div className="text-xs md:text-sm text-green-600 font-medium mt-1">
                    ↑ 8% this month
                  </div>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-200 rounded-full flex items-center justify-center ml-4">
                  <svg
                    className="w-6 h-6 md:w-8 md:h-8 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Inactive Customers */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4 md:p-6 border border-red-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs md:text-sm text-red-600 font-medium mb-1">
                    Inactive Customers
                  </div>
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold text-red-900">
                    {customerStats.inactive_customer_users?.toLocaleString() ||
                      "0"}
                  </div>
                  <div className="text-xs md:text-sm text-red-600 font-medium mt-1">
                    ↓ 2% this month
                  </div>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-red-200 rounded-full flex items-center justify-center ml-4">
                  <svg
                    className="w-6 h-6 md:w-8 md:h-8 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Clients Section */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                ALL CLIENTS
              </h2>
              <p className="text-blue-600 text-sm mt-1">ACTIVE MEMBERS</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => {
                  console.log("Sort changed to:", e.target.value);
                  setSortBy(e.target.value);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="name">Sort by: Name</option>
              </select>
              {loading && (
                <div className="text-sm text-gray-500 flex items-center justify-center sm:justify-start">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Cards View (hidden on desktop) */}
        <div className="block lg:hidden">
          {customers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <div className="text-lg font-medium mb-2">
                  No customers found
                </div>
                <div className="text-sm">
                  {debouncedSearchTerm
                    ? `No customers match your search for "${debouncedSearchTerm}"`
                    : "There are no customers in the system yet"}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(e) =>
                          handleSelectCustomer(customer.id, e.target.checked)
                        }
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {customer.full_name ||
                            `${customer.first_name} ${customer.last_name}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {customer.shipping_mark ||
                            `SM${customer.id.toString().padStart(3, "0")}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {customer.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="text-gray-900 truncate ml-2">
                        {customer.email || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="text-gray-900">
                        {customer.phone || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Region:</span>
                      <span className="text-gray-900">
                        {customer.region || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created by:</span>
                      <span className="text-gray-900">
                        {customer.created_by?.full_name ||
                          customer.created_by?.first_name ||
                          "System"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
                    <button
                      className="text-blue-600 hover:text-blue-900 p-1"
                      onClick={() => openPopup("view", customer)}
                      title="View details"
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
                    <button
                      className="text-green-600 hover:text-green-900 p-1"
                      onClick={() => openPopup("message", customer)}
                      title="Send message"
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
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    {/* Password reset removed */}
                    <button
                      className="text-orange-600 hover:text-orange-900 p-1"
                      onClick={() => openPopup("block", customer)}
                      title={
                        customer.is_active
                          ? "Block customer"
                          : "Unblock customer"
                      }
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {customer.is_active ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        )}
                      </svg>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900 p-1"
                      onClick={() => openPopup("delete", customer)}
                      title="Delete customer"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View (hidden on mobile) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={
                      selectedCustomers.length === customers.length &&
                      customers.length > 0
                    }
                  />
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shipping Mark
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Name
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Address
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 xl:px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg
                        className="w-12 h-12 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <div className="text-lg font-medium mb-2">
                        No customers found
                      </div>
                      <div className="text-sm">
                        {debouncedSearchTerm
                          ? `No customers match your search for "${debouncedSearchTerm}"`
                          : "There are no customers in the system yet"}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 xl:px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(e) =>
                          handleSelectCustomer(customer.id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.shipping_mark ||
                        `SM${customer.id.toString().padStart(3, "0")}`}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {customer.full_name ||
                          `${customer.first_name} ${customer.last_name}`}
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {customer.email || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.phone}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.region}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {customer.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {customer.created_by?.full_name ||
                          customer.created_by?.first_name ||
                          "System"}
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <button
                          className="text-blue-600 hover:text-blue-900 p-1"
                          onClick={() => openPopup("view", customer)}
                          title="View details"
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
                        <button
                          className="text-green-600 hover:text-green-900 p-1"
                          onClick={() => openPopup("message", customer)}
                          title="Send message"
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
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                        {/* Password reset removed */}
                        <button
                          className="text-orange-600 hover:text-orange-900 p-1"
                          onClick={() => openPopup("block", customer)}
                          title={
                            customer.is_active
                              ? "Block customer"
                              : "Unblock customer"
                          }
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {customer.is_active ? (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                              />
                            ) : (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            )}
                          </svg>
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 p-1"
                          onClick={() => openPopup("delete", customer)}
                          title="Delete customer"
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700 text-center sm:text-left">
              Showing data {startIndex + 1} to{" "}
              {Math.min(startIndex + pageSize, totalCustomers)} of{" "}
              {totalCustomers} entries
            </div>
            <div className="flex items-center justify-center sm:justify-end space-x-1 md:space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center"
              >
                <svg
                  className="w-4 h-4 md:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden md:inline">&lt;</span>
              </button>

              {/* Page numbers - show fewer on mobile */}
              <div className="flex space-x-1">
                {/* Mobile: show max 3 pages, Desktop: show max 5 pages */}
                <div className="flex space-x-1 sm:hidden">
                  {[...Array(Math.min(3, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={`px-2 py-1 border rounded text-sm ${
                          currentPage === pageNum
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 3 && (
                    <>
                      <span className="px-2 py-1 text-sm text-gray-500">
                        ...
                      </span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={loading}
                        className={`px-2 py-1 border rounded text-sm ${
                          currentPage === totalPages
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <div className="hidden sm:flex space-x-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 border rounded text-sm ${
                          currentPage === pageNum
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-3 py-2 text-sm text-gray-500">
                        ...
                      </span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={loading}
                        className={`px-3 py-2 border rounded text-sm ${
                          currentPage === totalPages
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages || loading}
                className="px-2 md:px-3 py-1 md:py-2 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center"
              >
                <svg
                  className="w-4 h-4 md:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="hidden md:inline">&gt;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Popup Modal */}
      {popup.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={closePopup}
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            {popup.type === "view" && popup.customer && (
              <div>
                <h2 className="text-lg font-bold mb-2">Customer Details</h2>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>{" "}
                    {popup.customer.full_name ||
                      `${popup.customer.first_name} ${popup.customer.last_name}`}
                  </div>
                  <div>
                    <span className="font-medium">Shipping Mark:</span>{" "}
                    {popup.customer.shipping_mark ||
                      `SM${popup.customer.id.toString().padStart(3, "0")}`}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>{" "}
                    {popup.customer.email || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>{" "}
                    {popup.customer.phone || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Region:</span>{" "}
                    {popup.customer.region || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Created By:</span>{" "}
                    {popup.customer.created_by?.full_name ||
                      popup.customer.created_by?.first_name ||
                      "System"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {popup.customer.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            )}
            {popup.type === "message" && popup.customer && (
              <div>
                <h2 className="text-lg font-bold mb-2">Send Message</h2>
                <div className="mb-2 text-sm">
                  To: {popup.customer.email || "N/A"}
                </div>
                <textarea
                  className="w-full border rounded p-2 mb-3 text-sm"
                  rows={4}
                  placeholder="Type your message here..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={actionLoading}
                />
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full"
                  onClick={handleSendMessage}
                  disabled={actionLoading || !messageText.trim()}
                >
                  {actionLoading ? "Sending..." : "Send Message"}
                </button>
              </div>
            )}
            {popup.type === "delete" && popup.customer && (
              <div>
                <h2 className="text-lg font-bold mb-2 text-red-700">
                  Delete Customer
                </h2>
                <div className="mb-4 text-sm">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">
                    {popup.customer.full_name ||
                      `${popup.customer.first_name} ${popup.customer.last_name}`}
                  </span>
                  ? This action cannot be undone.
                </div>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full"
                  onClick={handleDeleteCustomer}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
            {popup.type === "block" && popup.customer && (
              <div>
                <h2 className="text-lg font-bold mb-2 text-orange-700">
                  {popup.customer.is_active
                    ? "Block Customer"
                    : "Unblock Customer"}
                </h2>
                <div className="mb-4 text-sm">
                  Are you sure you want to{" "}
                  {popup.customer.is_active ? "block" : "unblock"}{" "}
                  <span className="font-semibold">
                    {popup.customer.full_name ||
                      `${popup.customer.first_name} ${popup.customer.last_name}`}
                  </span>
                  ?
                </div>
                <button
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium w-full"
                  onClick={handleToggleStatus}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? popup.customer.is_active
                      ? "Blocking..."
                      : "Unblocking..."
                    : popup.customer.is_active
                    ? "Block"
                    : "Unblock"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default CustomersPage;
