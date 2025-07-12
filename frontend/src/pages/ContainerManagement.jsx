import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import cargoService from '../services/cargoService';

const ContainerManagement = ({ showCreateModal: initialShowCreateModal = false, showEditModal: initialShowEditModal = false }) => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(initialShowCreateModal);
  const [showEditModal, setShowEditModal] = useState(initialShowEditModal);
  const [editingContainer, setEditingContainer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { containerId } = useParams();

  useEffect(() => {
    // Get filters from URL params
    const status = searchParams.get('status');
    const type = searchParams.get('cargo_type');
    const shouldShowCreate = searchParams.get('show_create') === 'true';
    
    if (status) setFilterStatus(status);
    if (type) setFilterType(type);
    if (shouldShowCreate) setShowCreateModal(true);
    
    // If containerId is present and showEditModal is true, load the container for editing
    if (containerId && initialShowEditModal) {
      loadContainerForEdit(containerId);
    }
    
    // Define and call fetch function within useEffect
    const loadContainers = async () => {
      try {
        setLoading(true);
        const params = {};
        
        if (searchParams.get('status')) params.status = searchParams.get('status');
        if (searchParams.get('cargo_type')) params.cargo_type = searchParams.get('cargo_type');
        
        const data = await cargoService.getContainers(params);
        setContainers(data.results || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadContainers();
  }, [searchParams, containerId, initialShowEditModal]);

  const loadContainerForEdit = async (id) => {
    try {
      const container = await cargoService.getContainer(id);
      setEditingContainer(container);
      setShowEditModal(true);
    } catch (err) {
      setError(`Error loading container for edit: ${err.message}`);
    }
  };

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (searchParams.get('status')) params.status = searchParams.get('status');
      if (searchParams.get('cargo_type')) params.cargo_type = searchParams.get('cargo_type');
      
      const data = await cargoService.getContainers(params);
      setContainers(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContainer = () => {
    setShowCreateModal(true);
  };

  const handleDeleteContainer = async (containerId) => {
    if (window.confirm('Are you sure you want to delete this container?')) {
      try {
        await cargoService.deleteContainer(containerId);
        fetchContainers();
      } catch (err) {
        alert('Error deleting container: ' + err.message);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      delivered: 'bg-green-100 text-green-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
      demurrage: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        type === 'sea' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'
      }`}>
        {type === 'sea' ? '🚢 Sea' : '✈️ Air'}
      </span>
    );
  };

  const filteredContainers = containers.filter(container => {
    const matchesSearch = container.container_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         container.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || container.status === filterStatus;
    const matchesType = !filterType || container.cargo_type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading containers...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Container Management</h1>
              <p className="mt-2 text-gray-600">Manage all cargo containers</p>
            </div>
            <button
              onClick={handleCreateContainer}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Container
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search containers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
                <option value="demurrage">Demurrage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="sea">Sea Cargo</option>
                <option value="air">Air Cargo</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterType('');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Container List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchContainers}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Demurrage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContainers.map((container) => (
                    <tr key={container.container_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => navigate(`/cargo/containers/${container.container_id}`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {container.container_id}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTypeBadge(container.cargo_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusBadge(container.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.route}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(container.eta).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.total_cargo_items || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.is_demurrage ? (
                          <span className="text-red-600 font-semibold">⚠️ Yes</span>
                        ) : (
                          <span className="text-green-600">✅ No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/cargo/containers/${container.container_id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/cargo/containers/${container.container_id}/edit`)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteContainer(container.container_id)}
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
              
              {filteredContainers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No containers found</p>
                  {(searchTerm || filterStatus || filterType) && (
                    <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Container Modal */}
        {showCreateModal && (
          <CreateContainerModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchContainers();
            }}
            defaultCargoType={searchParams.get('cargo_type') || 'sea'}
          />
        )}

        {/* Edit Container Modal */}
        {showEditModal && editingContainer && (
          <EditContainerModal
            container={editingContainer}
            onClose={() => {
              setShowEditModal(false);
              setEditingContainer(null);
              navigate('/cargo/containers');
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingContainer(null);
              fetchContainers();
              navigate('/cargo/containers');
            }}
          />
        )}
      </div>
    </div>
  );
};

// Create Container Modal Component
const CreateContainerModal = ({ onClose, onSuccess, defaultCargoType = 'sea' }) => {
  const [formData, setFormData] = useState({
    container_id: '',
    cargo_type: defaultCargoType,
    weight: '',
    cbm: '',
    load_date: '',
    eta: '',
    route: '',
    rates: '',
    stay_days: 0,
    delay_days: 0,
    status: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.container_id || !formData.cargo_type || !formData.load_date || 
          !formData.eta || !formData.route) {
        throw new Error('Please fill in all required fields: Container ID, Cargo Type, Load Date, ETA, and Route');
      }
      
      // Format the data to ensure proper data types
      const containerData = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        cbm: formData.cbm ? parseFloat(formData.cbm) : null,
        rates: formData.rates ? parseFloat(formData.rates) : null,
        stay_days: parseInt(formData.stay_days) || 0,
        delay_days: parseInt(formData.delay_days) || 0,
      };
      
      await cargoService.createContainer(containerData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Container</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Container ID *</label>
              <input
                type="text"
                name="container_id"
                value={formData.container_id}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cargo Type *</label>
              <select
                name="cargo_type"
                value={formData.cargo_type}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sea">Sea Cargo</option>
                <option value="air">Air Cargo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CBM</label>
              <input
                type="number"
                name="cbm"
                value={formData.cbm}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Load Date *</label>
              <input
                type="date"
                name="load_date"
                value={formData.load_date}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ETA *</label>
              <input
                type="date"
                name="eta"
                value={formData.eta}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Route *</label>
              <input
                type="text"
                name="route"
                value={formData.route}
                onChange={handleChange}
                required
                placeholder="e.g., China to Ghana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rates</label>
              <input
                type="number"
                name="rates"
                value={formData.rates}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stay Days</label>
              <input
                type="number"
                name="stay_days"
                value={formData.stay_days}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delay Days</label>
              <input
                type="number"
                name="delay_days"
                value={formData.delay_days}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="demurrage">Demurrage</option>
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
              {loading ? 'Creating...' : 'Create Container'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Container Modal Component
const EditContainerModal = ({ container, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    container_id: container.container_id,
    cargo_type: container.cargo_type,
    weight: container.weight || '',
    cbm: container.cbm || '',
    load_date: container.load_date,
    eta: container.eta,
    route: container.route,
    rates: container.rates || '',
    stay_days: container.stay_days || 0,
    delay_days: container.delay_days || 0,
    status: container.status
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!formData.container_id || !formData.cargo_type || !formData.load_date || 
          !formData.eta || !formData.route) {
        throw new Error('Please fill in all required fields: Container ID, Cargo Type, Load Date, ETA, and Route');
      }
      
      // Format the data to ensure proper data types
      const containerData = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        cbm: formData.cbm ? parseFloat(formData.cbm) : null,
        rates: formData.rates ? parseFloat(formData.rates) : null,
        stay_days: parseInt(formData.stay_days) || 0,
        delay_days: parseInt(formData.delay_days) || 0,
      };
      
      await cargoService.updateContainer(container.container_id, containerData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Container</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Container ID *</label>
              <input
                type="text"
                name="container_id"
                value={formData.container_id}
                onChange={handleChange}
                required
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cargo Type *</label>
              <select
                name="cargo_type"
                value={formData.cargo_type}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sea">Sea Cargo</option>
                <option value="air">Air Cargo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CBM</label>
              <input
                type="number"
                name="cbm"
                value={formData.cbm}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Load Date *</label>
              <input
                type="date"
                name="load_date"
                value={formData.load_date}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ETA *</label>
              <input
                type="date"
                name="eta"
                value={formData.eta}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Route *</label>
              <input
                type="text"
                name="route"
                value={formData.route}
                onChange={handleChange}
                required
                placeholder="e.g., China to Ghana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rates</label>
              <input
                type="number"
                name="rates"
                value={formData.rates}
                onChange={handleChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stay Days</label>
              <input
                type="number"
                name="stay_days"
                value={formData.stay_days}
                onChange={handleChange}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delay Days</label>
              <input
                type="number"
                name="delay_days"
                value={formData.delay_days}
                onChange={handleChange}
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="demurrage">Demurrage</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Container'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainerManagement;
