import React from "react";

const ControlPanel = ({
  onSortChange,
  onAddItem,
  onSearch,
  searchValue = "",
  sortValue = "",
}) => {
  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side - Sort and Add Item */}
        <div className="flex items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">SORT BY</label>
            <select
              value={sortValue}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              <option value="date">Date</option>
              <option value="status">Status</option>
              <option value="tracking_id">Tracking ID</option>
              <option value="description">Description</option>
            </select>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Add Item Button */}
          <button
            onClick={onAddItem}
            className="bg-white border border-gray-300 rounded-md px-4 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            ADD ITEM
          </button>
        </div>

        {/* Right side - Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="border border-gray-300 rounded-md pl-3 pr-10 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="w-4 h-4 text-gray-400"
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
    </div>
  );
};

export default ControlPanel;
