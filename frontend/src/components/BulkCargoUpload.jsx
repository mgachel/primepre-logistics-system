import { useState, useEffect } from 'react';
import cargoService from '../services/cargoService';

const BulkCargoUpload = ({ onClose, onSuccess, containerId }) => {
  const [file, setFile] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(containerId || '');
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

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

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
      }
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
      setError(`Upload failed: ${err.message}. Please check your authentication and try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (uploadResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Successful!</h2>
            <p className="text-gray-600 mb-6">
              {uploadResult.created_count || 0} cargo items have been successfully uploaded.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Cargo Items</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Container *
            </label>
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Container</option>
              {containers.map(container => (
                <option key={container.container_id} value={container.container_id}>
                  {container.container_id} ({container.cargo_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excel File *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: .xlsx, .xls
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Excel Format Requirements:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Column A: Client ID</li>
              <li>• Column B: Item Description</li>
              <li>• Column C: Quantity</li>
              <li>• Column D: Weight (kg)</li>
              <li>• Column E: CBM</li>
              <li>• Column F: Unit Value</li>
              <li>• Column G: Package Type</li>
              <li>• Column H: Package Count</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || !selectedContainer}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Items'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkCargoUpload;
