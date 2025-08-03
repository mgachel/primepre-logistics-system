import React, { useState } from "react";
import { ghanaWarehouseService } from "../services/ghanaWarehouseService";

const GhanaAddItemModal = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState("manual"); // "manual" or "excel"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Manual form state
  const [formData, setFormData] = useState({
    shipping_mark: "",
    supply_tracking: "",
    cbm: "",
    quantity: "",
    description: "",
    weight: "",
    supplier_name: "",
    estimated_value: "",
    location: "ACCRA", // Default location for Ghana
  });

  // Excel upload state
  const [excelFile, setExcelFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const resetModal = () => {
    setFormData({
      shipping_mark: "",
      supply_tracking: "",
      cbm: "",
      quantity: "",
      description: "",
      weight: "",
      supplier_name: "",
      estimated_value: "",
      location: "ACCRA",
    });
    setExcelFile(null);
    setUploadResult(null);
    setError("");
    setSuccess("");
    setMode("manual");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      if (!formData.shipping_mark.trim()) {
        throw new Error("Shipping mark is required");
      }
      if (!formData.supply_tracking.trim()) {
        throw new Error("Supply tracking number is required");
      }
      if (!formData.cbm || parseFloat(formData.cbm) <= 0) {
        throw new Error("CBM must be greater than 0");
      }
      if (!formData.quantity || parseInt(formData.quantity) <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      // Prepare data for API
      const itemData = {
        shipping_mark: formData.shipping_mark.trim(),
        supply_tracking: formData.supply_tracking.trim(),
        cbm: parseFloat(formData.cbm),
        quantity: parseInt(formData.quantity),
        description: formData.description.trim() || "No description provided",
        location: formData.location || "ACCRA",
      };

      // Add optional fields if provided
      if (formData.weight && parseFloat(formData.weight) > 0) {
        itemData.weight = parseFloat(formData.weight);
      }
      if (formData.supplier_name && formData.supplier_name.trim()) {
        itemData.supplier_name = formData.supplier_name.trim();
      }
      if (
        formData.estimated_value &&
        parseFloat(formData.estimated_value) > 0
      ) {
        itemData.estimated_value = parseFloat(formData.estimated_value);
      }

      const result = await ghanaWarehouseService.createItem(itemData);
      setSuccess("Item added successfully!");

      setTimeout(() => {
        onSuccess(result);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("Error adding item:", error);
      setError(error.message || "Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Please select a valid Excel file (.xlsx or .xls)");
        return;
      }
      setExcelFile(file);
      setError("");
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      setError("Please select an Excel file first");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    setUploadResult(null);

    try {
      const result = await ghanaWarehouseService.uploadExcel(excelFile);
      setUploadResult(result);
      setSuccess(`Successfully processed ${result.success_count || 0} items!`);

      if (result.success_count > 0) {
        setTimeout(() => {
          onSuccess(result);
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Error uploading Excel file:", error);
      setError(error.message || "Failed to upload Excel file");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await ghanaWarehouseService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "ghana_warehouse_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading template:", error);
      setError("Failed to download template");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Add New Item - Ghana Warehouse
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
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

          {/* Mode Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === "manual"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              disabled={isSubmitting}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setMode("excel")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === "excel"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              disabled={isSubmitting}
            >
              Excel Upload
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {mode === "manual" ? (
            /* Manual Entry Form */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Mark/Client *
                  </label>
                  <input
                    type="text"
                    name="shipping_mark"
                    value={formData.shipping_mark}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., PMJOHN01"
                    maxLength={20}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supply Tracking Number *
                  </label>
                  <input
                    type="text"
                    name="supply_tracking"
                    value={formData.supply_tracking}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TRK123456789"
                    maxLength={50}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CBM (Cubic Meters) *
                  </label>
                  <input
                    type="number"
                    name="cbm"
                    value={formData.cbm}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2.5"
                    min="0.001"
                    max="1000"
                    step="0.001"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (CTNS) *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 5"
                    min="1"
                    max="100000"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 100.5"
                    min="0.01"
                    max="50000"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  >
                    <option value="ACCRA">Accra</option>
                    <option value="KUMASI">Kumasi</option>
                    <option value="TAKORADI">Takoradi</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={formData.supplier_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ABC Trading Ltd"
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Value (USD)
                  </label>
                  <input
                    type="number"
                    name="estimated_value"
                    value={formData.estimated_value}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1500.00"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Description of the goods"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          ) : (
            /* Excel Upload Mode */
            <div className="space-y-6">
              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Step 1: Download Template
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Download the Ghana warehouse Excel template to ensure your
                  data is formatted correctly. Required fields: Shipping Mark,
                  Supply Tracking, CBM, and Quantity.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Template
                </button>
              </div>

              {/* File Upload */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  📁 Step 2: Upload Your File
                </h4>
                <div className="mt-2">
                  <label className="block text-sm text-gray-600 mb-2">
                    Select Excel file (.xlsx or .xls)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isSubmitting}
                  />
                  {excelFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {excelFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Upload Results
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-lg font-bold text-green-600">
                        {uploadResult.success_count || 0}
                      </p>
                      <p className="text-xs text-green-600">Successful</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-lg font-bold text-red-600">
                        {uploadResult.error_count || 0}
                      </p>
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">
                        {uploadResult.total_rows || 0}
                      </p>
                      <p className="text-xs text-blue-600">Total Rows</p>
                    </div>
                  </div>

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-red-600 mb-2">
                        Errors found:
                      </p>
                      <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                        {uploadResult.errors.map((error, index) => (
                          <p key={index} className="text-xs text-red-600 mb-1">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExcelUpload}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
                  disabled={isSubmitting || !excelFile}
                >
                  {isSubmitting ? "Uploading..." : "Upload Excel"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GhanaAddItemModal;
