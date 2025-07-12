import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import cargoService from '../services/cargoService';
import BulkCargoUpload from '../components/BulkCargoUpload';

const CargoItemsManagement = ({ showCreateModal: initialShowCreateModal = false }) => {
  const [cargoItems, setCargoItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(initialShowCreateModal);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContainer, setFilterContainer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const container = searchParams.get('container');
    if (container) setFilterContainer(container);
    
    // If showCreateModal prop is true, show the create modal
    if (initialShowCreateModal) {
      setShowCreateModal(true);
    }
    
    // Define and call fetch function within useEffect
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch cargo items with any filters from URL
        const params = {};
        if (searchParams.get('container')) params.container = searchParams.get('container');
        if (searchParams.get('status')) params.status = searchParams.get('status');
        
        const [itemsData, containersData, customersData] = await Promise.all([
          cargoService.getCargoItems(params),
          cargoService.getContainers(),
          cargoService.getCustomers()
        ]);
        
        setCargoItems(itemsData.results || itemsData);
        setContainers(containersData.results || containersData);
        setCustomers(customersData.results || customersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [searchParams, initialShowCreateModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch cargo items with any filters from URL
      const params = {};
      if (searchParams.get('container')) params.container = searchParams.get('container');
      if (searchParams.get('status')) params.status = searchParams.get('status');
      
      const [itemsData, containersData, customersData] = await Promise.all([
        cargoService.getCargoItems(params),
        cargoService.getContainers(),
        cargoService.getCustomers()
      ]);
      
      setCargoItems(itemsData.results || itemsData);
      setContainers(containersData.results || containersData);
      setCustomers(customersData.results || customersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this cargo item?')) {
      try {
        await cargoService.deleteCargoItem(itemId);
        fetchData();
      } catch (err) {
        alert('Error deleting cargo item: ' + err.message);
      }
    }
  };

  const filteredItems = cargoItems.filter(item => {
    const matchesSearch = item.tracking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesContainer = !filterContainer || item.container === filterContainer;
    const matchesStatus = !filterStatus || item.status === filterStatus;
    const matchesClient = !filterClient || item.client === filterClient;
    
    return matchesSearch && matchesContainer && matchesStatus && matchesClient;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cargo items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cargo Items Management</h1>
              <p className="mt-2 text-gray-600">Track and manage individual cargo items</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                📤 Bulk Upload
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Item
              </button>
              <button
                onClick={() => navigate('/cargo/dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{cargoItems.length}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full text-white text-2xl">
                📦
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-orange-600">
                  {cargoItems.filter(item => item.status === 'pending').length}
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full text-white text-2xl">
                ⏳
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {cargoItems.filter(item => item.status === 'in_transit').length}
                </p>
              </div>
              <div className="bg-yellow-500 p-3 rounded-full text-white text-2xl">
                🚛
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-3xl font-bold text-green-600">
                  {cargoItems.filter(item => item.status === 'delivered').length}
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full text-white text-2xl">
                ✅
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Container</label>
              <select
                value={filterContainer}
                onChange={(e) => setFilterContainer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Containers</option>
                {containers.map(container => (
                  <option key={container.container_id} value={container.container_id}>
                    {container.container_id} ({container.cargo_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Clients</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.shipping_mark} - {customer.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterContainer('');
                  setFilterStatus('');
                  setFilterClient('');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Items List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Cargo Items ({filteredItems.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight/CBM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="font-mono">{item.tracking_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{item.item_description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => navigate(`/cargo/containers/${item.container}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {item.container}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="font-medium">{item.client_shipping_mark}</div>
                          <div className="text-gray-400 text-xs">{item.client_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          item.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'delayed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-xs">
                          <div>{item.weight ? `${item.weight} kg` : 'N/A'}</div>
                          <div className="text-gray-400">{item.cbm ? `${item.cbm} CBM` : 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_value ? `$${parseFloat(item.total_value).toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/cargo/items/${item.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/cargo/items/${item.id}/edit`)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No cargo items found</p>
                  {(searchTerm || filterContainer || filterStatus || filterClient) && (
                    <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Item Modal */}
        {showCreateModal && (
          <CreateCargoItemModal
            onClose={() => {
              setShowCreateModal(false);
              // If we came from the create route, navigate back to items list
              if (initialShowCreateModal) {
                navigate('/cargo/items');
              }
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchData();
              // If we came from the create route, navigate back to items list
              if (initialShowCreateModal) {
                navigate('/cargo/items');
              }
            }}
            containers={containers}
            customers={customers}
            defaultContainer={searchParams.get('container')}
          />
        )}

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <BulkCargoUpload
            onClose={() => setShowBulkUpload(false)}
            onSuccess={() => {
              setShowBulkUpload(false);
              fetchData();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Create Cargo Item Modal Component
const CreateCargoItemModal = ({ onClose, onSuccess, containers, customers, defaultContainer = '' }) => {
  const [formData, setFormData] = useState({
    container: defaultContainer || '',
    client: '',
    item_description: '',
    quantity: 1,
    weight: '',
    cbm: '',
    unit_value: '',
    total_value: '',
    status: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      await cargoService.createCargoItem(formData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate total value
      if (name === 'quantity' || name === 'unit_value') {
        const quantity = name === 'quantity' ? parseFloat(value) || 0 : parseFloat(prev.quantity) || 0;
        const unitValue = name === 'unit_value' ? parseFloat(value) || 0 : parseFloat(prev.unit_value) || 0;
        updated.total_value = (quantity * unitValue).toString();
      }
      
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Cargo Item</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Container *</label>
              <select
                name="container"
                value={formData.container || ''}
                onChange={handleChange}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
              <select
                name="client"
                value={formData.client || ''}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Client</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.shipping_mark} - {customer.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item Description *</label>
            <textarea
              name="item_description"
              value={formData.item_description || ''}
              onChange={handleChange}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the cargo item..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity || 1}
                onChange={handleChange}
                required
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CBM *</label>
              <input
                type="number"
                name="cbm"
                value={formData.cbm || ''}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Value ($)</label>
              <input
                type="number"
                name="unit_value"
                value={formData.unit_value || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Value ($)</label>
              <input
                type="number"
                name="total_value"
                value={formData.total_value || ''}
                onChange={handleChange}
                step="0.01"
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status || 'pending'}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CargoItemsManagement;
