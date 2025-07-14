import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import goodsService from '../../services/goodsService';

const ExcelOperations = ({ warehouse = 'china', onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setUploadResult({
        success: false,
        message: 'Please select a valid Excel file (.xlsx or .xls)'
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      let result;
      if (warehouse === 'china') {
        result = await goodsService.uploadChinaExcel(file);
      } else {
        result = await goodsService.uploadGhanaExcel(file);
      }

      setUploadResult({
        success: true,
        message: `Successfully processed ${result.created_count || 0} items`,
        details: result
      });

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const downloadTemplate = async () => {
    try {
      let blob;
      const filename = `${warehouse}_goods_template.xlsx`;
      
      if (warehouse === 'china') {
        blob = await goodsService.downloadChinaTemplate();
      } else {
        blob = await goodsService.downloadGhanaTemplate();
      }

      goodsService.downloadFile(blob, filename);
    } catch (error) {
      alert(`Failed to download template: ${error.message}`);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Excel Operations
        </h3>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              Drop Excel file here or{' '}
              <span className="text-blue-600 hover:text-blue-500">browse</span>
            </span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Supports .xlsx and .xls files up to 10MB
          </p>
        </div>
      </div>

      {/* Upload Status */}
      {uploading && (
        <div className="mt-4 flex items-center justify-center p-4 bg-blue-50 rounded-md">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm font-medium text-blue-700">
            Processing file...
          </span>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className={`mt-4 p-4 rounded-md ${
          uploadResult.success ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                uploadResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
              </h3>
              <div className={`mt-1 text-sm ${
                uploadResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {uploadResult.message}
              </div>
              {uploadResult.details && uploadResult.success && (
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc list-inside space-y-1">
                    {uploadResult.details.created_count > 0 && (
                      <li>Created: {uploadResult.details.created_count} items</li>
                    )}
                    {uploadResult.details.updated_count > 0 && (
                      <li>Updated: {uploadResult.details.updated_count} items</li>
                    )}
                    {uploadResult.details.errors && uploadResult.details.errors.length > 0 && (
                      <li>Errors: {uploadResult.details.errors.length} items had issues</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="ml-3 flex-shrink-0">
              <button
                onClick={() => setUploadResult(null)}
                className={`rounded-md p-1.5 inline-flex items-center justify-center text-sm ${
                  uploadResult.success 
                    ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' 
                    : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-medium mb-2">Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Download the template file to see the required format</li>
          <li>Fill in your goods data following the template structure</li>
          <li>Upload the completed Excel file</li>
          <li>Review the results and fix any errors if needed</li>
        </ol>
      </div>
    </div>
  );
};

export default ExcelOperations;
