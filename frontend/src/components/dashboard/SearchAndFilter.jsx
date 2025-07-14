import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, MapPin, User, Package, ChevronDown, Tag } from 'lucide-react';

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

  const activeFilterCount = Object.entries(filters)
    .filter(([key, value]) => value !== '' && key !== 'search')
    .length;

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-5">
        {/* Main filters row */}
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search items by ID, name, or shipping mark..."
                className="form-control pl-10"
                aria-label="Search"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              {filters.search && (
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <div className="relative">
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="form-control appearance-none pr-10"
                aria-label="Filter by status"
              >
                <option value="">All Status</option>
                {getStatusOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Filter Toggle Button */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              aria-expanded={showAdvanced}
            >
              <Filter className="h-4 w-4 mr-2 text-primary-500" />
              {showAdvanced ? 'Hide Filters' : 'Advanced Filters'}
              {activeFilterCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4 mr-1 text-gray-500" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Section */}
      {showAdvanced && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="location" className="block text-xs font-medium text-gray-700 mb-1.5">
                <div className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  Location
                </div>
              </label>
              <div className="relative">
                <select
                  id="location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="form-control"
                  aria-label="Filter by location"
                >
                  {getLocationOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="supplier" className="block text-xs font-medium text-gray-700 mb-1.5">
                <div className="flex items-center">
                  <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                  Supplier
                </div>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="supplier"
                  value={filters.supplier_name}
                  onChange={(e) => handleFilterChange('supplier_name', e.target.value)}
                  placeholder="Filter by supplier..."
                  className="form-control"
                  aria-label="Filter by supplier"
                />
                {filters.supplier_name && (
                  <button
                    onClick={() => handleFilterChange('supplier_name', '')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label="Clear supplier filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date_from" className="block text-xs font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    From
                  </div>
                </label>
                <input
                  type="date"
                  id="date_from"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="form-control"
                  aria-label="Filter from date"
                />
              </div>
              <div>
                <label htmlFor="date_to" className="block text-xs font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                    To
                  </div>
                </label>
                <input
                  type="date"
                  id="date_to"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="form-control"
                  aria-label="Filter to date"
                />
              </div>
            </div>
          </div>
          
          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => {
                if (!value || key === 'search') return null;
                
                let label = '';
                if (key === 'status') {
                  label = getStatusOptions().find(opt => opt.value === value)?.label || value;
                } else if (key === 'location') {
                  label = getLocationOptions().find(opt => opt.value === value)?.label || value;
                } else if (key === 'supplier_name') {
                  label = `Supplier: ${value}`;
                } else if (key === 'date_from') {
                  label = `From: ${new Date(value).toLocaleDateString()}`;
                } else if (key === 'date_to') {
                  label = `To: ${new Date(value).toLocaleDateString()}`;
                } else {
                  label = `${key}: ${value}`;
                }
                
                return (
                  <div 
                    key={key} 
                    className="inline-flex items-center bg-gray-100 text-gray-800 text-xs rounded-full px-2.5 py-1 border border-gray-200"
                  >
                    <Tag className="h-3 w-3 mr-1.5 text-gray-500" />
                    {label}
                    <button
                      onClick={() => handleFilterChange(key, '')}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      aria-label={`Remove ${label} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
