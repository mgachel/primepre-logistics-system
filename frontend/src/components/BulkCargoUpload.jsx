import { useState, useEffect } from 'react';
import { Upload, Download, X, AlertCircle, CheckCircle, FileText, Container } from 'lucide-react';
import cargoService from '../services/cargoService';

const BulkCargoUpload = ({ onClose, onSuccess, containerId }) => {
  const [file, setFile] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(containerId || '');
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const data = await cargoService.getContainers();
      setContainers(data.results || data);
    } catch (err) {
      console.error('Failed to fetch containers:', err);
    }
  };

  const downloadTemplate = () => {
    // Create Excel-compatible CSV template with proper headers
    const headers = [
      'shipping_mark',
      'item_description', 
      'quantity',
      'cbm',
      'weight',
      'unit_value',
      'total_value',
      'status'
    ];
    
    const sampleData = [
      'CUST001',
      'Sample Item Description',
      '10',
      '1.5',
      '25.5',
      '100.00',
      '1000.00',
      'pending'
    ];

    // Create CSV content with UTF-8 BOM for Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cargo_items_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    // Validate file type
    if (selectedFile.name.endsWith('.xlsx') || 
        selectedFile.name.endsWith('.xls') || 
        selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select an Excel file (.xlsx, .xls) or CSV file (.csv)');
      setFile(null);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    if (!selectedContainer) {
      setError('Please select a container');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await cargoService.bulkUploadCargoItems(file, selectedContainer);
      setUploadResult(result);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Bulk upload failed:', err);
      
      // Parse error message to provide better user feedback
      let errorMessage = err.message || 'Upload failed';
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again and try again.';
      } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        errorMessage = 'Invalid file format or data. Please check your file and try again.';
      } else if (errorMessage.includes('404')) {
        errorMessage = 'Upload service not found. Please contact support.';
      } else if (errorMessage.includes('500')) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (uploadResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Complete!</h2>
              <p className="text-gray-600 mb-6">Your cargo items have been processed</p>
              
              {/* Results Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.created_items || 0}
                    </div>
                    <div className="text-gray-600">Items Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {uploadResult.errors ? uploadResult.errors.length : 0}
                    </div>
                    <div className="text-gray-600">Errors</div>
                  </div>
                </div>
              </div>
              
              {/* Error Details */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="text-left mb-6">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Errors Encountered
                  </h4>
                  <div className="max-h-32 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-700 mb-2 last:mb-0 p-2 bg-white rounded border-l-2 border-red-400">
                        {typeof error === 'object' ? `Row ${error.row}: ${error.error}` : error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Cargo Items</h2>
              <p className="text-sm text-gray-500">Import multiple cargo items at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Before You Start</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Ensure all customers exist with their shipping marks</li>
                  <li>• Download the template below for correct format</li>
                  <li>• Select the destination container first</li>
                  <li>• Upload will create items and update summaries</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900">Upload Error</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">
            {/* Container Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Container className="w-4 h-4 inline mr-2" />
                Select Container *
              </label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Choose a container...</option>
                {containers.map(container => (
                  <option key={container.container_id} value={container.container_id}>
                    {container.container_id} - {container.cargo_type?.toUpperCase()} 
                    ({container.status || 'Active'})
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FileText className="w-4 h-4 inline mr-2" />
                Upload File *
              </label>
              
              {/* Drag & Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-green-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Drag and drop your file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports .xlsx, .xls, .csv files
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Download Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Need a template?</h4>
                  <p className="text-sm text-gray-600">Download our sample template with correct format</p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Download</span>
                </button>
              </div>
            </div>

            {/* Column Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">Required Columns</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">shipping_mark</span>
                    <span className="text-blue-600 text-xs">Required</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">item_description</span>
                    <span className="text-blue-600 text-xs">Required</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">quantity</span>
                    <span className="text-blue-600 text-xs">Required</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">cbm</span>
                    <span className="text-blue-600 text-xs">Required</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">weight</span>
                    <span className="text-gray-500 text-xs">Optional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">unit_value</span>
                    <span className="text-gray-500 text-xs">Optional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">total_value</span>
                    <span className="text-gray-500 text-xs">Optional</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">status</span>
                    <span className="text-gray-500 text-xs">Optional</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !file || !selectedContainer}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Items</span>
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

export default BulkCargoUpload;
