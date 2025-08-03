import React, { useState, useContext } from "react";
import StatusCard from "../components/StatusCard";
import ControlPanel from "../components/ControlPanel";
import DataTable from "../components/DataTable";
import GhanaAddItemModal from "../components/GhanaAddItemModal";
import { BoxIcon, TruckIcon, FlagIcon } from "../components/Icons";
import { useGhanaWarehouse } from "../hooks/useGhanaWarehouse";
import { AuthContext } from "../contexts/authContext";
import { ghanaWarehouseService } from "../services/ghanaWarehouseService";

function GhanaWarehousePage() {
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

  // Determine user role - check if user is staff or customer
  const userRole = user?.user_type || user?.is_staff ? "staff" : "customer";

  // Use the custom hook for Ghana warehouse data
  const {
    data: warehouseData,
    statistics,
    loading,
    loadingMessage,
    error,
    searchItems,
    sortItems,
    isStaffUser,
  } = useGhanaWarehouse(userRole);

  const handleSortChange = async (value) => {
    setSortValue(value);
    console.log("Sort changed to:", value);

    // Map frontend sort values to backend ordering
    const orderingMap = {
      date: "-created_at",
      status: "status",
      tracking_id: "supply_tracking",
      description: "description",
    };

    const ordering = orderingMap[value];
    if (ordering) {
      try {
        await sortItems(ordering);
      } catch (err) {
        console.error("Error sorting items:", err);
      }
    }
  };

  const handleAddItem = () => {
    console.log("Add item clicked");
    if (!isStaffUser) {
      alert("Only staff members can add items");
      return;
    }
    setShowAddItemModal(true);
  };

  const handleAddItemSuccess = (newItem) => {
    console.log("Item added successfully:", newItem);
    // Refresh the data by reloading the page
    window.location.reload();
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    console.log("Search value:", value);

    // Use local search for instant filtering
    searchItems(value);
  };

  const handleRowAction = (item) => {
    console.log("View details for:", item);
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleUpdate = (item) => {
    console.log("Update item:", item);
    setSelectedItem(item);
    setUpdateForm({ description: item.description });
    setShowUpdateModal(true);
  };

  const handleDelete = (item) => {
    console.log("Delete item:", item);
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleUpdateStatus = (item) => {
    console.log("Update status for:", item);
    setSelectedItem(item);
    setStatusForm({
      status: item.status?.toUpperCase() || "PENDING",
      notes: "",
    });
    setShowUpdateStatusModal(true);
  };

  // Modal action handlers
  const confirmUpdate = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await ghanaWarehouseService.updateItem(selectedItem.id, {
        description: updateForm.description,
      });
      setShowUpdateModal(false);
      window.location.reload(); // Temporary solution
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await ghanaWarehouseService.deleteItem(selectedItem.id);
      setShowDeleteModal(false);
      window.location.reload(); // Temporary solution
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmUpdateStatus = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      await ghanaWarehouseService.updateStatus(
        selectedItem.id,
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
  const transformedData = warehouseData.map((item) => ({
    tracking_id: item.supply_tracking || item.item_id || "-",
    shipping_mark: item.shipping_mark || "-",
    description: item.description || "-",
    status: item.status?.toLowerCase() || "pending",
    added_by:
      item.created_by?.full_name || item.created_by?.username || "System",
    id: item.id, // Keep the original ID for actions
  }));

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-20"></div>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 rounded-lg p-8 animate-pulse">
          <div className="text-center mb-6">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">{loadingMessage}</p>
          </div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    const isAuthError =
      error.includes("authentication") ||
      error.includes("credentials") ||
      error.includes("login");

    return (
      <div className="space-y-6">
        <div
          className={`border rounded-lg p-4 ${
            isAuthError
              ? "bg-yellow-50 border-yellow-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center">
            <div
              className={`mr-3 ${
                isAuthError ? "text-yellow-600" : "text-red-600"
              }`}
            >
              {isAuthError ? (
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
                    d="M12 15v2m0-6V7m0 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
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
                  ? "Please log in to access the Ghana warehouse data."
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="Items Received"
          count={statistics.received}
          icon={<BoxIcon className="w-6 h-6 text-blue-600" />}
          backgroundColor="bg-blue-100"
          textColor="text-blue-600"
          countTextColor="text-blue-900"
          borderColor="border-blue-200"
        />

        <StatusCard
          title="Pending Delivery"
          count={statistics.pending}
          icon={
            <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
          }
          backgroundColor="bg-yellow-100"
          textColor="text-yellow-600"
          countTextColor="text-yellow-900"
          borderColor="border-yellow-200"
        />

        <StatusCard
          title="Ready for Delivery"
          count={statistics.ready_for_delivery}
          icon={<TruckIcon className="w-6 h-6 text-green-600" />}
          backgroundColor="bg-green-100"
          textColor="text-green-600"
          countTextColor="text-green-900"
          borderColor="border-green-200"
        />

        <StatusCard
          title="Delivered"
          count={statistics.delivered}
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          }
          backgroundColor="bg-purple-100"
          textColor="text-purple-600"
          countTextColor="text-purple-900"
          borderColor="border-purple-200"
        />
      </div>

      {/* Control Panel */}
      <ControlPanel
        onSortChange={handleSortChange}
        onAddItem={handleAddItem}
        onSearch={handleSearch}
        searchValue={searchValue}
        sortValue={sortValue}
      />

      {/* Data Table */}
      <DataTable
        data={transformedData}
        onRowAction={handleRowAction}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUpdateStatus={handleUpdateStatus}
        userRole={userRole}
        emptyMessage="No warehouse items found. Click 'ADD ITEM' to get started."
      />

      {/* View Details Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Item Details
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
                    Tracking ID
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.tracking_id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Shipping Mark
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.shipping_mark}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.description}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedItem.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : selectedItem.status === "ready_for_delivery"
                        ? "bg-green-100 text-green-800"
                        : selectedItem.status === "delivered"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedItem.status === "ready_for_delivery"
                      ? "Ready for Delivery"
                      : selectedItem.status?.charAt(0).toUpperCase() +
                        selectedItem.status?.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Added By
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedItem.added_by}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Item Modal */}
      {showUpdateModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Update Item
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
                    Description
                  </label>
                  <textarea
                    value={updateForm.description}
                    onChange={(e) =>
                      setUpdateForm({ description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter item description"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdate}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Item
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
              <div className="mb-4">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.315 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      Are you sure?
                    </h4>
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete item "
                      {selectedItem.tracking_id}"? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdateStatusModal && selectedItem && (
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
                    Current Status
                  </label>
                  <p className="text-sm text-gray-600">
                    {selectedItem.status?.charAt(0).toUpperCase() +
                      selectedItem.status?.slice(1).replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={statusForm.status}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="READY_FOR_DELIVERY">
                      Ready for Delivery
                    </option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="FLAGGED">Flagged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={statusForm.notes}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter any notes about this status change"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUpdateStatusModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdateStatus}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <GhanaAddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onSuccess={handleAddItemSuccess}
      />
    </div>
  );
}

export default GhanaWarehousePage;
