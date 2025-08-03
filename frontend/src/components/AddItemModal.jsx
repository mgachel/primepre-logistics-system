import React, { useState } from "react";
import { chinaWarehouseService } from "../services/chinaWarehouseService";

const AddItemModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: "",
    supply_tracking: "",
    shipping_mark: "",
    status: "PENDING",
    cbm: "0.001", // Default minimum CBM
    weight: "",
    quantity: "1", // Default quantity
    location: "GUANGZHOU",
    method_of_shipping: "SEA",
    supplier_name: "",
    estimated_value: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Excel upload states
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState({});
  const [uploadResults, setUploadResults] = useState(null);

  const statusOptions = [
    { value: "PENDING", label: "Pending" },
    { value: "READY_FOR_SHIPPING", label: "Ready for Shipping" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "FLAGGED", label: "Flagged" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const locationOptions = [
    { value: "GUANGZHOU", label: "Guangzhou" },
    { value: "SHENZHEN", label: "Shenzhen" },
    { value: "SHANGHAI", label: "Shanghai" },
    { value: "YIWU", label: "Yiwu" },
    { value: "OTHER", label: "Other" },
  ];

  const shippingMethodOptions = [
    { value: "SEA", label: "Sea" },
    { value: "AIR", label: "Air" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.supply_tracking.trim()) {
      newErrors.supply_tracking = "Tracking ID is required";
    }
    if (!formData.shipping_mark.trim()) {
      newErrors.shipping_mark = "Shipping Mark is required";
    }

    // CBM and Quantity are required by the backend
    if (!formData.cbm || isNaN(formData.cbm) || parseFloat(formData.cbm) <= 0) {
      newErrors.cbm = "CBM is required and must be a positive number";
    }
    if (
      !formData.quantity ||
      isNaN(formData.quantity) ||
      parseInt(formData.quantity) <= 0
    ) {
      newErrors.quantity = "Quantity is required and must be a positive number";
    }

    // Optional numeric fields validation (only if provided)
    if (
      formData.weight &&
      (isNaN(formData.weight) || parseFloat(formData.weight) <= 0)
    ) {
      newErrors.weight = "Weight must be a positive number";
    }
    if (
      formData.estimated_value &&
      (isNaN(formData.estimated_value) ||
        parseFloat(formData.estimated_value) <= 0)
    ) {
      newErrors.estimated_value = "Estimated value must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API - convert string numbers to proper types and provide defaults for required fields
      const apiData = {
        description: formData.description.trim(),
        supply_tracking: formData.supply_tracking.trim(),
        shipping_mark: formData.shipping_mark.trim(),
        status: formData.status,
        location: formData.location,
        method_of_shipping: formData.method_of_shipping,
        // Required fields with defaults
        cbm: formData.cbm ? parseFloat(formData.cbm) : 0.001, // Minimum CBM value
        quantity: formData.quantity ? parseInt(formData.quantity) : 1, // Default quantity
      };

      // Add optional fields only if they have values
      if (formData.weight) apiData.weight = parseFloat(formData.weight);
      if (formData.supplier_name.trim())
        apiData.supplier_name = formData.supplier_name.trim();
      if (formData.estimated_value)
        apiData.estimated_value = parseFloat(formData.estimated_value);
      if (formData.notes.trim()) apiData.notes = formData.notes.trim();

      console.log("Submitting data:", apiData);

      const result = await chinaWarehouseService.createItem(apiData);
      console.log("Item created successfully:", result);

      // Reset form
      setFormData({
        description: "",
        supply_tracking: "",
        shipping_mark: "",
        status: "PENDING",
        cbm: "0.001", // Reset to default minimum CBM
        weight: "",
        quantity: "1", // Reset to default quantity
        location: "GUANGZHOU",
        method_of_shipping: "SEA",
        supplier_name: "",
        estimated_value: "",
        notes: "",
      });

      onSuccess && onSuccess(result);
      onClose();
    } catch (error) {
      console.error("Error creating item:", error);

      // Handle validation errors from backend
      if (error.message.includes("already exists")) {
        setErrors({ supply_tracking: "This tracking ID already exists" });
      } else {
        setErrors({ general: error.message || "Failed to create item" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUploadExcel = () => {
    setShowExcelUpload(true);
  };

  const handleCloseExcelModal = () => {
    setShowExcelUpload(false);
    setExcelFile(null);
    setUploadErrors({});
    setUploadResults(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setExcelFile(file);
    setUploadErrors({});
  };

  const handleDownloadTemplate = async () => {
    try {
      await chinaWarehouseService.downloadTemplate();
    } catch (error) {
      console.error("Error downloading template:", error);
      setUploadErrors({
        template: "Failed to download template: " + error.message,
      });
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      setUploadErrors({ file: "Please select a file to upload" });
      return;
    }

    // Validate file type
    const allowedTypes = [".xlsx", ".xls", ".csv"];
    const fileExtension = excelFile.name
      .toLowerCase()
      .substring(excelFile.name.lastIndexOf("."));

    if (!allowedTypes.includes(fileExtension)) {
      setUploadErrors({
        file: "Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)",
      });
      return;
    }

    setUploadLoading(true);
    setUploadErrors({});

    try {
      const result = await chinaWarehouseService.uploadExcel(excelFile);
      console.log("Excel upload result:", result);

      setUploadResults(result);

      // If upload was successful, close both modals and refresh
      if (result.results && result.results.successful_creates > 0) {
        setTimeout(() => {
          handleCloseExcelModal();
          onSuccess && onSuccess(result);
          onClose();
        }, 3000); // Show results for 3 seconds before closing
      }
    } catch (error) {
      console.error("Error uploading Excel file:", error);

      // Handle validation errors from backend
      if (error.message.includes("excel_errors")) {
        setUploadErrors({ validation: error.message });
      } else {
        setUploadErrors({
          general: error.message || "Failed to upload Excel file",
        });
      }
    } finally {
      setUploadLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Add Item Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Add New Item
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Fill form to add new item or upload Excel file
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Upload Excel Button */}
                <button
                  type="button"
                  onClick={handleUploadExcel}
                  className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span>Upload Excel</span>
                </button>
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
            </div>

            {/* Error Messages */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description - Full Width */}
              <div>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Description"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.description && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Tracking ID and Status - Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    name="supply_tracking"
                    value={formData.supply_tracking}
                    onChange={handleInputChange}
                    placeholder="Tracking ID"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.supply_tracking
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.supply_tracking && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.supply_tracking}
                    </p>
                  )}
                </div>
                <div>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shipping Mark - Full Width */}
              <div>
                <input
                  type="text"
                  name="shipping_mark"
                  value={formData.shipping_mark}
                  onChange={handleInputChange}
                  placeholder="Shipping Mark"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.shipping_mark ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.shipping_mark && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.shipping_mark}
                  </p>
                )}
              </div>

              {/* CBM, Weight, Quantity - Three Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <input
                    type="number"
                    name="cbm"
                    value={formData.cbm}
                    onChange={handleInputChange}
                    placeholder="CBM (m³) - Required"
                    step="0.001"
                    min="0.001"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.cbm ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.cbm && (
                    <p className="text-red-600 text-xs mt-1">{errors.cbm}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    placeholder="Weight (kg)"
                    step="0.01"
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.weight ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.weight && (
                    <p className="text-red-600 text-xs mt-1">{errors.weight}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="Quantity - Required"
                    min="1"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.quantity ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.quantity && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.quantity}
                    </p>
                  )}
                </div>
              </div>

              {/* Location and Shipping Method - Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {locationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    name="method_of_shipping"
                    value={formData.method_of_shipping}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {shippingMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Supplier Name and Estimated Value - Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleInputChange}
                    placeholder="Supplier Name (optional)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    name="estimated_value"
                    value={formData.estimated_value}
                    onChange={handleInputChange}
                    placeholder="Estimated Value ($)"
                    step="0.01"
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.estimated_value
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.estimated_value && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.estimated_value}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes - Full Width */}
              <div>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional Notes (optional)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Adding Item..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Upload Excel File
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Upload Excel file to bulk create warehouse items
                  </p>
                </div>
                <button
                  onClick={handleCloseExcelModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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

              {/* Error Messages */}
              {uploadErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{uploadErrors.general}</p>
                </div>
              )}

              {uploadErrors.file && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{uploadErrors.file}</p>
                </div>
              )}

              {uploadErrors.validation && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">
                    {uploadErrors.validation}
                  </p>
                </div>
              )}

              {uploadErrors.template && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">
                    {uploadErrors.template}
                  </p>
                </div>
              )}

              {/* Success Results */}
              {uploadResults && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">
                    Upload Results
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      ✅ Successfully created:{" "}
                      {uploadResults.results?.successful_creates || 0} items
                    </p>
                    <p>
                      ❌ Failed: {uploadResults.results?.failed_creates || 0}{" "}
                      items
                    </p>
                    <p>
                      📊 Total processed:{" "}
                      {uploadResults.results?.total_processed || 0} rows
                    </p>
                    {uploadResults.results?.errors &&
                      uploadResults.results.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside">
                            {uploadResults.results.errors
                              .slice(0, 3)
                              .map((error, index) => (
                                <li key={index} className="text-xs">
                                  {error}
                                </li>
                              ))}
                            {uploadResults.results.errors.length > 3 && (
                              <li className="text-xs">
                                ... and{" "}
                                {uploadResults.results.errors.length - 3} more
                                errors
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    The page will refresh automatically...
                  </p>
                </div>
              )}

              {/* Template Download Section */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">
                  📋 Excel Template
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Download the template to see the required column format.
                  Expected columns:
                </p>
                <div className="text-xs text-blue-600 grid grid-cols-2 gap-1 mb-3">
                  <span>• SHIPPING MARK/CLIENT*</span>
                  <span>• SUPPLIER&TRACKING NO*</span>
                  <span>• CBM*</span>
                  <span>• CTNS (Quantity)*</span>
                  <span>• DESCRIPTION</span>
                  <span>• DATE OF LOADING</span>
                </div>
                <p className="text-xs text-blue-600 mb-3">* Required fields</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                >
                  Download Template
                </button>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: .xlsx, .xls, .csv
                  </p>
                  {excelFile && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Selected: {excelFile.name} (
                      {(excelFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCloseExcelModal}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    disabled={uploadLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExcelUpload}
                    disabled={!excelFile || uploadLoading}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadLoading ? "Uploading..." : "Upload File"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddItemModal;
