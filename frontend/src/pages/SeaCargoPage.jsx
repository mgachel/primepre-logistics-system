import React, { useState, useContext } from "react";
import StatusCard from "../components/StatusCard";
import ControlPanel from "../components/ControlPanel";
import DataTable from "../components/DataTable";
import { BoxIcon, TruckIcon, FlagIcon } from "../components/Icons";
import { useSeaCargo } from "../hooks/useSeaCargo";
import { AuthContext } from "../contexts/authContext";
import { seaCargoService } from "../services/seaCargoService";

function SeaCargoPage() {
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("");
  const { user } = useContext(AuthContext);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddCargoItemModal, setShowAddCargoItemModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cargoItems, setCargoItems] = useState([]);
  const [loadingCargoItems, setLoadingCargoItems] = useState(false);
  const [updateForm, setUpdateForm] = useState({ description: "" });
  const [statusForm, setStatusForm] = useState({ status: "", notes: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // New item form for adding items to cargo
  const [newItemForm, setNewItemForm] = useState({
    tracking_id: "",
    shipping_mark: "",
    description: "",
    quantity: 1,
    weight: "",
    dimensions: "",
    notes: "",
  });

  // Add Cargo form state
  const [addCargoForm, setAddCargoForm] = useState({
    container_id: "",
    route: "",
    weight: "",
    cbm: "",
    load_date: "",
    eta: "",
    rates: "",
    stay_days: 0,
    delay_days: 0,
    status: "pending",
  });

  // Determine user role - check if user is staff or customer
  const userRole = user?.user_type || user?.is_staff ? "staff" : "customer";

  // Use the custom hook for Sea cargo data
  const {
    data: cargoData,
    statistics,
    loading,
    loadingMessage,
    error,
    searchItems,
    sortItems,
    isStaffUser,
  } = useSeaCargo(userRole);

  const handleSortChange = async (value) => {
    setSortValue(value);
    console.log("Sort changed to:", value);

    // Map frontend sort values to backend ordering
    const orderingMap = {
      date: "-created_at",
      status: "status",
      container_id: "container_id",
      route: "route",
    };

    const orderingValue = orderingMap[value] || value;

    try {
      await sortItems(
        orderingValue.replace("-", ""),
        orderingValue.startsWith("-") ? "desc" : "asc"
      );
    } catch (error) {
      console.error("Error sorting:", error);
    }
  };

  const handleAddItem = () => {
    // Reset form
    setAddCargoForm({
      container_id: "",
      route: "",
      weight: "",
      cbm: "",
      load_date: "",
      eta: "",
      rates: "",
      stay_days: 0,
      delay_days: 0,
      status: "pending",
    });
    setShowAddItemModal(true);
  };

  const handleAddItemSuccess = (newItem) => {
    console.log("New cargo added:", newItem);
    // Refresh the data to show the new item
    window.location.reload(); // Temporary solution - ideally should update state
  };

  // Handle add cargo form submission
  const confirmAddCargo = async () => {
    setActionLoading(true);
    try {
      // Prepare data for API
      const cargoData = {
        ...addCargoForm,
        cargo_type: "sea", // Always set to sea for sea cargo page
        weight: addCargoForm.weight ? parseFloat(addCargoForm.weight) : null,
        cbm: addCargoForm.cbm ? parseFloat(addCargoForm.cbm) : null,
        rates: addCargoForm.rates ? parseFloat(addCargoForm.rates) : null,
        stay_days: parseInt(addCargoForm.stay_days) || 0,
        delay_days: parseInt(addCargoForm.delay_days) || 0,
      };

      // Remove empty values
      Object.keys(cargoData).forEach((key) => {
        if (cargoData[key] === "" || cargoData[key] === null) {
          if (key !== "weight" && key !== "cbm" && key !== "rates") {
            delete cargoData[key];
          }
        }
      });

      await seaCargoService.createContainer(cargoData);
      setShowAddItemModal(false);
      handleAddItemSuccess(cargoData);
    } catch (error) {
      console.error("Error creating cargo:", error);
      alert("Failed to create cargo: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    searchItems(value);
  };

  const handleRowAction = async (item) => {
    setSelectedItem(item);
    setLoadingCargoItems(true);
    setShowViewModal(true);

    try {
      // Fetch items for this cargo container
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/cargo/api/containers/${item.container_id}/cargo_items/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cargo items");
      }

      const itemsData = await response.json();
      setCargoItems(itemsData);
    } catch (error) {
      console.error("Error loading cargo items:", error);
      setCargoItems([]);
    } finally {
      setLoadingCargoItems(false);
    }
  };
  const handleUpdate = (item) => {
    setSelectedItem(item);
    setUpdateForm({
      description: item.description || item.route || "",
      route: item.route || "",
      weight: item.weight || "",
      cbm: item.cbm || "",
      rates: item.rates || "",
    });
    setShowUpdateModal(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleUpdateStatus = (item) => {
    setSelectedItem(item);
    setStatusForm({ status: item.status || "pending", notes: "" });
    setShowUpdateStatusModal(true);
  };

  const handleAddItemToCargo = () => {
    setNewItemForm({
      tracking_id: "",
      shipping_mark: "",
      description: "",
      quantity: 1,
      weight: "",
      dimensions: "",
      notes: "",
    });
    setShowAddCargoItemModal(true);
  };

  const handleExcelUpload = () => {
    setShowExcelUploadModal(true);
  };

  const confirmAddItemToCargo = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      // API call to add item to cargo container
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/cargo/api/cargo-items/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            container: selectedItem.container_id,
            client: user?.id || 1, // Use current user ID or fallback to 1
            item_description: newItemForm.description,
            quantity: parseInt(newItemForm.quantity) || 1,
            weight: newItemForm.weight ? parseFloat(newItemForm.weight) : null,
            cbm: 1.0, // Default CBM value - you might want to add this to the form
            unit_value: null,
            total_value: null,
            status: "pending",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add item");
      }

      const result = await response.json();
      console.log("Item added successfully:", result);

      // Refresh cargo items
      await handleRowAction(selectedItem);

      setShowAddCargoItemModal(false);
      alert("Item added to cargo successfully!");
    } catch (error) {
      console.error("Error adding item to cargo:", error);
      alert("Failed to add item to cargo: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedItem) return;

    setActionLoading(true);
    try {
      // Prepare form data for bulk upload API
      const formData = new FormData();
      formData.append("excel_file", file);
      formData.append("container_id", selectedItem.container_id);

      // API call to upload Excel file for cargo items
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/api/cargo/api/bulk-upload/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      console.log("Bulk upload successful:", result);

      // Refresh cargo items
      await handleRowAction(selectedItem);

      setShowExcelUploadModal(false);
      alert(
        `Upload successful! Created ${result.created_items} items. ${
          result.errors.length > 0
            ? `${result.errors.length} errors occurred.`
            : ""
        }`
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Modal action handlers
  const confirmUpdate = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await seaCargoService.updateContainer(
        selectedItem.id || selectedItem.container_id,
        updateForm
      );
      setShowUpdateModal(false);
      window.location.reload(); // Temporary solution
    } catch (error) {
      console.error("Error updating cargo:", error);
      alert("Failed to update cargo: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await seaCargoService.deleteContainer(
        selectedItem.id || selectedItem.container_id
      );
      setShowDeleteModal(false);
      window.location.reload(); // Temporary solution
    } catch (error) {
      console.error("Error deleting cargo:", error);
      alert("Failed to delete cargo: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmUpdateStatus = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await seaCargoService.updateContainerStatus(
        selectedItem.id || selectedItem.container_id,
        statusForm.status,
        statusForm.notes
      );
      setShowUpdateStatusModal(false);
      window.location.reload(); // Temporary solution
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Transform data for the DataTable component
  const transformedData = cargoData.map((item) => ({
    container_id: item.container_id || "-",
    route: item.route || "-",
    load_date: item.load_date || "-",
    eta: item.eta || "-",
    cbm: item.cbm || "-",
    status: item.status?.toLowerCase() || "pending",
    id: item.container_id || item.id, // Use container_id as primary key for containers
  }));

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-20"></div>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 rounded-lg p-8 animate-pulse">
          <div className="text-center mb-6">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">{loadingMessage}</p>
          </div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    const isAuthError =
      error.toLowerCase().includes("auth") ||
      error.toLowerCase().includes("token") ||
      error.toLowerCase().includes("unauthorized");

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4">
              <div className="h-20 flex items-center justify-center">
                <span className="text-gray-500 text-sm">No data</span>
              </div>
            </div>
          ))}
        </div>
        <div
          className={`rounded-lg p-6 ${
            isAuthError
              ? "bg-yellow-50 border border-yellow-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {isAuthError ? (
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`font-medium ${
                  isAuthError ? "text-yellow-800" : "text-red-800"
                }`}
              >
                {isAuthError ? "Authentication Required" : "Error Loading Data"}
              </h3>
              <p
                className={`text-sm ${
                  isAuthError ? "text-yellow-700" : "text-red-700"
                }`}
              >
                {isAuthError
                  ? "Please log in to access the sea cargo data."
                  : error}
              </p>
              {isAuthError && (
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                >
                  Go to Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Total Shipments"
          count={statistics.total_shipments}
          icon={<BoxIcon className="w-6 h-6 text-blue-600" />}
          backgroundColor="bg-blue-50"
          textColor="text-blue-600"
          countTextColor="text-blue-900"
          borderColor="border-blue-200"
        />
        <StatusCard
          title="In Transit"
          count={statistics.in_transit}
          icon={<TruckIcon className="w-6 h-6 text-yellow-600" />}
          backgroundColor="bg-yellow-50"
          textColor="text-yellow-600"
          countTextColor="text-yellow-900"
          borderColor="border-yellow-200"
        />
        <StatusCard
          title="Delivered"
          count={statistics.delivered}
          icon={<FlagIcon className="w-6 h-6 text-green-600" />}
          backgroundColor="bg-green-50"
          textColor="text-green-600"
          countTextColor="text-green-900"
          borderColor="border-green-200"
        />
      </div>

      {/* Control Panel */}
      <ControlPanel
        searchValue={searchValue}
        sortValue={sortValue}
        onSearchChange={handleSearch}
        onSortChange={handleSortChange}
        onAddItem={handleAddItem}
        isStaff={isStaffUser}
        addButtonText="Add Cargo"
        searchPlaceholder="Search containers, routes, tracking..."
        sortOptions={[
          { value: "", label: "Sort by..." },
          { value: "date", label: "Date Added" },
          { value: "status", label: "Status" },
          { value: "container_id", label: "Container ID" },
          { value: "route", label: "Route" },
        ]}
      />

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Load Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CBM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                // Loading state
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 7 }).map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap"
                      >
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : transformedData.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
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
                    <p className="text-gray-500 text-sm">
                      No sea cargo containers found
                    </p>
                  </td>
                </tr>
              ) : (
                // Data rows
                transformedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.container_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.route}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.load_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.eta}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.cbm}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : item.status === "in_transit"
                            ? "bg-blue-100 text-blue-800"
                            : item.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : item.status === "demurrage"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.status?.charAt(0)?.toUpperCase() +
                          item.status?.slice(1).replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* View Items Button */}
                        <button
                          onClick={() => handleRowAction(item)}
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 bg-blue-100 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="View Items in Container"
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
                            {/* Edit Container Button */}
                            <button
                              onClick={() => handleUpdate(item)}
                              className="inline-flex items-center justify-center w-8 h-8 text-green-600 bg-green-100 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                              title="Edit Container"
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
                              onClick={() => handleUpdateStatus(item)}
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

                            {/* Delete Container Button */}
                            <button
                              onClick={() => handleDelete(item)}
                              className="inline-flex items-center justify-center w-8 h-8 text-red-600 bg-red-100 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                              title="Delete Container"
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cargo Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Sea Cargo Container
                </h3>
                <button
                  onClick={() => setShowAddItemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Container ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Container ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addCargoForm.container_id}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        container_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter unique container ID"
                    required
                  />
                </div>

                {/* Route */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addCargoForm.route}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        route: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., China to Ghana"
                    required
                  />
                </div>

                {/* Load Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Load Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addCargoForm.load_date}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        load_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* ETA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Time of Arrival (ETA){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addCargoForm.eta}
                    onChange={(e) =>
                      setAddCargoForm({ ...addCargoForm, eta: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addCargoForm.weight}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        weight: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* CBM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CBM (Cubic Meters)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addCargoForm.cbm}
                    onChange={(e) =>
                      setAddCargoForm({ ...addCargoForm, cbm: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Rates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rates ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addCargoForm.rates}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        rates: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Stay Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stay Days in Port
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addCargoForm.stay_days}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        stay_days: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Delay Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addCargoForm.delay_days}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        delay_days: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={addCargoForm.status}
                    onChange={(e) =>
                      setAddCargoForm({
                        ...addCargoForm,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="demurrage">Demurrage</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddItemModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddCargo}
                  disabled={
                    actionLoading ||
                    !addCargoForm.container_id ||
                    !addCargoForm.route ||
                    !addCargoForm.load_date ||
                    !addCargoForm.eta
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Creating..." : "Create Cargo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal - Container Items */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Container Items: {selectedItem.container_id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Route: {selectedItem.route} | Status: {selectedItem.status}
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mb-6">
                <button
                  onClick={handleAddItemToCargo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Item Manually
                </button>
                <button
                  onClick={handleExcelUpload}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Upload Excel File
                </button>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    Items in Container ({cargoItems.length})
                  </h4>
                </div>

                {loadingCargoItems ? (
                  <div className="p-8 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
                    <p className="text-gray-600">Loading items...</p>
                  </div>
                ) : cargoItems.length === 0 ? (
                  <div className="p-8 text-center">
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
                    <p className="text-gray-500 mb-4">
                      No items in this container yet
                    </p>
                    <p className="text-sm text-gray-400">
                      Add items manually or upload an Excel file to get started
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tracking ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Shipping Mark
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Weight (kg)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            CBM
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cargoItems.map((item, index) => (
                          <tr
                            key={item.id || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.tracking_id || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.client_name || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.client_shipping_mark || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.item_description || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.quantity || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.weight ? `${item.weight} kg` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.cbm || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.unit_value ? `$${item.unit_value}` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.total_value ? `$${item.total_value}` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  item.status === "delivered"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "in_transit"
                                    ? "bg-blue-100 text-blue-800"
                                    : item.status === "delayed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {item.status || "pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item to Cargo Modal */}
      {showAddCargoItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add Item to Container
                </h3>
                <button
                  onClick={() => setShowAddCargoItemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItemForm.tracking_id}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        tracking_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter tracking ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Mark
                  </label>
                  <input
                    type="text"
                    value={newItemForm.shipping_mark}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        shipping_mark: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter shipping mark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newItemForm.description}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter item description"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newItemForm.quantity}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemForm.weight}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          weight: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    value={newItemForm.dimensions}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        dimensions: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 10x20x30 cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newItemForm.notes}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        notes: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddCargoItemModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddItemToCargo}
                  disabled={
                    actionLoading ||
                    !newItemForm.tracking_id ||
                    !newItemForm.description
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? "Adding..." : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showExcelUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Excel File
                </h3>
                <button
                  onClick={() => setShowExcelUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Excel File Format Requirements:
                  </h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p className="font-medium mb-2">
                      Required Columns (must exist in Excel):
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        <strong>shipping_mark</strong> - Customer shipping mark
                      </li>
                      <li>
                        <strong>item_description</strong> - Description of the
                        item
                      </li>
                      <li>
                        <strong>quantity</strong> - Number of items
                      </li>
                      <li>
                        <strong>cbm</strong> - Cubic meter measurement
                      </li>
                    </ul>

                    <p className="font-medium mt-3 mb-2">Optional Columns:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        <strong>weight</strong> - Weight in kg
                      </li>
                      <li>
                        <strong>unit_value</strong> - Value per unit
                      </li>
                      <li>
                        <strong>total_value</strong> - Total value
                      </li>
                      <li>
                        <strong>status</strong> - Item status (default: pending)
                      </li>
                    </ul>

                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="font-medium">Important Notes:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>
                          Column names must match exactly (case-sensitive)
                        </li>
                        <li>
                          Customer must exist with the provided shipping_mark
                        </li>
                        <li>Supports .xlsx, .xls, and .csv files</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowExcelUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Update Container
                </h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route
                  </label>
                  <input
                    type="text"
                    value={updateForm.route}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, route: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={updateForm.weight}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, weight: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CBM
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={updateForm.cbm}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, cbm: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rates
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={updateForm.rates}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, rates: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdate}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Container
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this container? This action
                cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdateStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Update Status
                </h3>
                <button
                  onClick={() => setShowUpdateStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusForm.status}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="demurrage">Demurrage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={statusForm.notes}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any notes about this status change..."
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowUpdateStatusModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdateStatus}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeaCargoPage;
