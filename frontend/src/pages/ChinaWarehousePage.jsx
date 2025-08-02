import React, { useState } from "react";
import StatusCard from "../components/StatusCard";
import ControlPanel from "../components/ControlPanel";
import DataTable from "../components/DataTable";
import { BoxIcon, TruckIcon, FlagIcon } from "../components/Icons";

function ChinaWarehousePage() {
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("");

  // Sample data - replace with actual API data
  const [warehouseData] = useState([
    {
      tracking_id: "TRK001",
      shipping_mark: "SMARK001",
      description: "Electronics Components",
      status: "received",
      added_by: "John Doe",
    },
    {
      tracking_id: "TRK002",
      shipping_mark: "SMARK002",
      description: "Textile Products",
      status: "shipped",
      added_by: "Jane Smith",
    },
    {
      tracking_id: "TRK003",
      shipping_mark: "SMARK003",
      description: "Industrial Equipment",
      status: "flagged",
      added_by: "Mike Johnson",
    },
  ]);

  // Status counts - replace with actual API data
  const statusCounts = {
    received: 1,
    shipped: 1,
    flagged: 1,
  };

  const handleSortChange = (value) => {
    setSortValue(value);
    console.log("Sort changed to:", value);
  };

  const handleAddItem = () => {
    console.log("Add item clicked");
    // Implement add item functionality
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    console.log("Search value:", value);
  };

  const handleRowAction = (item) => {
    console.log("Row action for:", item);
    // Implement row action functionality
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Items Recieved"
          count={statusCounts.received}
          icon={<BoxIcon className="w-6 h-6 text-blue-600" />}
          backgroundColor="bg-blue-100"
          textColor="text-blue-600"
          countTextColor="text-blue-900"
          borderColor="border-blue-200"
        />

        <StatusCard
          title="Shipped"
          count={statusCounts.shipped}
          icon={<TruckIcon className="w-6 h-6 text-green-600" />}
          backgroundColor="bg-green-100"
          textColor="text-green-600"
          countTextColor="text-green-900"
          borderColor="border-green-200"
        />

        <StatusCard
          title="Flagged"
          count={statusCounts.flagged}
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
        data={warehouseData}
        onRowAction={handleRowAction}
        emptyMessage="No warehouse items found. Click 'ADD ITEM' to get started."
      />
    </div>
  );
}

export default ChinaWarehousePage;
