import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

const AddItemModal = ({ isOpen, onClose, onSubmit, warehouse, loading = false }) => {
  const [formData, setFormData] = useState({
    shipping_mark: '',
    supply_tracking: '',
    cbm: '',
    weight: '',
    quantity: '',
    description: '',
    location: warehouse === 'china' ? 'GUANGZHOU' : 'ACCRA',
    method_of_shipping: 'SEA',
    supplier_name: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});

  const locationOptions = warehouse === 'china' 
    ? [
        { value: 'GUANGZHOU', label: 'Guangzhou' },
        { value: 'SHENZHEN', label: 'Shenzhen' },
        { value: 'SHANGHAI', label: 'Shanghai' },
        { value: 'YIWU', label: 'Yiwu' },
        { value: 'OTHER', label: 'Other' }
      ]
    : [
        { value: 'ACCRA', label: 'Accra' },
        { value: 'KUMASI', label: 'Kumasi' },
        { value: 'TAKORADI', label: 'Takoradi' },
        { value: 'OTHER', label: 'Other' }
      ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.shipping_mark.trim()) {
      newErrors.shipping_mark = 'Shipping mark is required';
    }
    if (!formData.supply_tracking.trim()) {
      newErrors.supply_tracking = 'Supply tracking number is required';
    }
    if (!formData.cbm) {
      newErrors.cbm = 'CBM is required';
    } else if (isNaN(formData.cbm) || parseFloat(formData.cbm) <= 0) {
      newErrors.cbm = 'CBM must be a positive number';
    }
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(formData.quantity) || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    
    // Optional weight validation
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) <= 0)) {
      newErrors.weight = 'Weight must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      cbm: parseFloat(formData.cbm),
      weight: formData.weight ? parseFloat(formData.weight) : null,
      quantity: parseInt(formData.quantity)
    };
    
    onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({
      shipping_mark: '',
      supply_tracking: '',
      cbm: '',
      weight: '',
      quantity: '',
      description: '',
      location: warehouse === 'china' ? 'GUANGZHOU' : 'ACCRA',
      method_of_shipping: 'SEA',
      supplier_name: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Add New Item - {warehouse === 'china' ? 'China' : 'Ghana'} Warehouse
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Mark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Mark <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping_mark"
                  value={formData.shipping_mark}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.shipping_mark ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter shipping mark"
                />
                {errors.shipping_mark && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.shipping_mark}
                  </p>
                )}
              </div>

              {/* Supply Tracking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supply Tracking <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="supply_tracking"
                  value={formData.supply_tracking}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.supply_tracking ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter supplier tracking number"
                />
                {errors.supply_tracking && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.supply_tracking}
                  </p>
                )}
              </div>

              {/* CBM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CBM (Cubic Meters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  name="cbm"
                  value={formData.cbm}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cbm ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.000"
                />
                {errors.cbm && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.cbm}
                  </p>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.weight ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.weight && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.weight}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.quantity}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {locationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method of Shipping */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Method of Shipping
                </label>
                <select
                  name="method_of_shipping"
                  value={formData.method_of_shipping}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SEA">Sea</option>
                  <option value="AIR">Air</option>
                </select>
              </div>

              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier name"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter item description"
              />
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes (optional)"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Item
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
