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
  const [selectedItem, setSelectedItem] = useState(null);
  const [updateForm, setUpdateForm] = useState({ description: "" });
  const [statusForm, setStatusForm] = useState({ status: "", notes: "" });
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleRowAction = (item) => {
    setSelectedItem(item);
    setShowViewModal(true);
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
      <DataTable
        data={transformedData}
        columns={[
          { key: "container_id", label: "Container ID" },
          { key: "route", label: "Route" },
          { key: "load_date", label: "Load Date" },
          { key: "eta", label: "ETA" },
          { key: "cbm", label: "CBM" },
          { key: "status", label: "Status" },
        ]}
        onRowClick={handleRowAction}
        onEdit={isStaffUser ? handleUpdate : undefined}
        onDelete={isStaffUser ? handleDelete : undefined}
        onUpdateStatus={isStaffUser ? handleUpdateStatus : undefined}
        loading={loading}
        emptyMessage="No sea cargo containers found"
      />

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

      {/* View Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Container Details
                </h3>
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
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Container ID
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.container_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Route
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.route}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Weight
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.weight} kg
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    CBM
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.cbm}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ETA
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.eta}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedItem.status === "delivered"
                        ? "bg-green-100 text-green-800"
                        : selectedItem.status === "in_transit"
                        ? "bg-blue-100 text-blue-800"
                        : selectedItem.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedItem.status?.charAt(0)?.toUpperCase() +
                      selectedItem.status?.slice(1).replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
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
