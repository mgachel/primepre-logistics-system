import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, MapPin, User, Package } from 'lucide-react';

const SearchAndFilter = ({ 
  onFiltersChange, 
  warehouse = 'china',
  initialFilters = {} 
}) => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    location: '',
    supplier_name: '',
    date_from: '',
    date_to: '',
    ...initialFilters
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      location: '',
      supplier_name: '',
      date_from: '',
      date_to: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const getLocationOptions = () => {
    if (warehouse === 'china') {
      return [
        { value: '', label: 'All Locations' },
        { value: 'GUANGZHOU', label: 'Guangzhou' },
        { value: 'SHENZHEN', label: 'Shenzhen' },
        { value: 'SHANGHAI', label: 'Shanghai' },
        { value: 'YIWU', label: 'Yiwu' },
        { value: 'OTHER', label: 'Other' }
      ];
    } else {
      return [
        { value: '', label: 'All Locations' },
        { value: 'ACCRA', label: 'Accra' },
        { value: 'KUMASI', label: 'Kumasi' },
        { value: 'TAKORADI', label: 'Takoradi' },
        { value: 'OTHER', label: 'Other' }
      ];
    }
  };

  const getStatusOptions = () => {
    if (warehouse === 'china') {
      return [
        { value: '', label: 'All Status' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'READY_FOR_SHIPPING', label: 'Ready for Shipping' },
        { value: 'SHIPPED', label: 'Shipped' },
        { value: 'FLAGGED', label: 'Flagged' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ];
    } else {
      return [
        { value: '', label: 'All Status' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'READY_FOR_DELIVERY', label: 'Ready for Delivery' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'FLAGGED', label: 'Flagged' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ];
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Search & Filter
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              id="search"
              placeholder="Search by item ID, shipping mark, tracking number..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {getStatusOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showAdvanced && (
          <>
            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </label>
              <select
                id="location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {getLocationOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Name */}
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Supplier
              </label>
              <input
                type="text"
                id="supplier"
                placeholder="Supplier name..."
                value={filters.supplier_name}
                onChange={(e) => handleFilterChange('supplier_name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date From */}
            <div>
              <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                From Date
              </label>
              <input
                type="date"
                id="date_from"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                To Date
              </label>
              <input
                type="date"
                id="date_to"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            
            let label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (key === 'date_from') label = 'From';
            if (key === 'date_to') label = 'To';
            
            return (
              <span
                key={key}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {label}: {value}
                <button
                  onClick={() => handleFilterChange(key, '')}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
