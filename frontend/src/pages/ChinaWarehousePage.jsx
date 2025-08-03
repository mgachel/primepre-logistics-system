import React, { useState, useContext } from "react";
import StatusCard from "../components/StatusCard";
import ControlPanel from "../components/ControlPanel";
import DataTable from "../components/DataTable";
import { BoxIcon, TruckIcon, FlagIcon } from "../components/Icons";
import { useChinaWarehouse } from "../hooks/useChinaWarehouse";
import { AuthContext } from "../contexts/authContext";

function ChinaWarehousePage() {
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("");
  const { user } = useContext(AuthContext);

  // Determine user role - check if user is staff or customer
  const userRole = user?.user_type || user?.is_staff ? "staff" : "customer";

  // Use the custom hook for China warehouse data
  const {
    data: warehouseData,
    statistics,
    loading,
    error,
    searchItems,
    sortItems,
    isStaffUser,
  } = useChinaWarehouse(userRole);

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
    // TODO: Implement add item modal/form
    if (!isStaffUser) {
      alert("Only staff members can add items");
      return;
    }
    // This would typically open a modal or navigate to an add item form
  };

  const handleSearch = async (value) => {
    setSearchValue(value);
    console.log("Search value:", value);

    try {
      if (value.trim()) {
        await searchItems(value);
      } else {
        // If search is cleared, fetch all items
        window.location.reload(); // Temporary solution - ideally we'd have a refreshData method
      }
    } catch (err) {
      console.error("Error searching items:", err);
    }
  };

  const handleRowAction = (item) => {
    console.log("Row action for:", item);
    // TODO: Implement row action menu (edit, delete, update status, etc.)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-20"></div>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 rounded-lg p-8 animate-pulse">
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
                  ? "Please log in to access the China warehouse data."
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
          title="Items Recieved"
          count={statistics.received + statistics.pending}
          icon={<BoxIcon className="w-6 h-6 text-blue-600" />}
          backgroundColor="bg-blue-100"
          textColor="text-blue-600"
          countTextColor="text-blue-900"
          borderColor="border-blue-200"
        />

        <StatusCard
          title="Shipped"
          count={statistics.shipped}
          icon={<TruckIcon className="w-6 h-6 text-green-600" />}
          backgroundColor="bg-green-100"
          textColor="text-green-600"
          countTextColor="text-green-900"
          borderColor="border-green-200"
        />

        <StatusCard
          title="Flagged"
          count={statistics.flagged}
          icon={<FlagIcon className="w-6 h-6 text-red-600" />}
          backgroundColor="bg-red-100"
          textColor="text-red-600"
          countTextColor="text-red-900"
          borderColor="border-red-200"
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
        emptyMessage="No warehouse items found. Click 'ADD ITEM' to get started."
      />
    </div>
  );
}

export default ChinaWarehousePage;
