import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  X
} from 'lucide-react';
import userService from '../services/userService';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setClients(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (clientId, currentStatus) => {
    setActionLoading(clientId);
    try {
      await userService.toggleUserStatus(clientId, !currentStatus);
      await fetchClients(); // Refresh the list
    } catch (err) {
      setError(`Failed to ${currentStatus ? 'block' : 'unblock'} client: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleContactClient = (client) => {
    if (client.email) {
      window.open(`mailto:${client.email}`, '_blank');
    } else if (client.phone) {
      window.open(`tel:${client.phone}`, '_blank');
    }
  };

  const getStatusStats = () => {
    const stats = {
      total: clients.length,
      active: clients.filter(c => c.is_active).length,
      blocked: clients.filter(c => !c.is_active).length,
      customers: clients.filter(c => c.user_role === 'CUSTOMER').length,
      business: clients.filter(c => c.user_type === 'BUSINESS').length,
    };
    return stats;
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.shipping_mark?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || 
                         (filterStatus === 'active' && client.is_active) ||
                         (filterStatus === 'blocked' && !client.is_active);
    
    const matchesRole = !filterRole || client.user_role === filterRole;
    const matchesType = !filterType || client.user_type === filterType;
    
    return matchesSearch && matchesStatus && matchesRole && matchesType;
  });

  const stats = getStatusStats();

  if (loading) {
    return (
      <DashboardLayout title="Client Management">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Client Management">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Users className="h-8 w-8 mr-3 text-blue-600" />
                  Client Management
                </h1>
                <p className="mt-2 text-gray-600">Manage all clients and customer accounts</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/cargo/dashboard')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-full">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus('active')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="bg-green-500 p-3 rounded-full">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus('blocked')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Blocked</p>
                  <p className="text-3xl font-bold text-red-600">{stats.blocked}</p>
                </div>
                <div className="bg-red-500 p-3 rounded-full">
                  <UserX className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterRole('CUSTOMER')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customers</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.customers}</p>
                </div>
                <div className="bg-purple-500 p-3 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterType('BUSINESS')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Business</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.business}</p>
                </div>
                <div className="bg-orange-500 p-3 rounded-full">
                  <Building className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
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
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
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
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Business</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('');
                    setFilterRole('');
                    setFilterType('');
                  }}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Clients List */}
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchClients}
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Clients ({filteredClients.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shipping Mark
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {client.first_name} {client.last_name}
                              </div>
                              {client.company_name && (
                                <div className="text-sm text-gray-500">{client.company_name}</div>
                              )}
                              <div className="text-xs text-gray-400">{client.region}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="space-y-1">
                            {client.email && (
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                <span className="truncate max-w-xs">{client.email}</span>
                              </div>
                            )}
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              <span>{client.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                          {client.shipping_mark}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            client.user_role === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' :
                            client.user_role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                            client.user_role === 'STAFF' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {client.user_role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            {client.user_type === 'BUSINESS' ? (
                              <Building className="h-4 w-4 mr-1 text-orange-500" />
                            ) : (
                              <Users className="h-4 w-4 mr-1 text-blue-500" />
                            )}
                            {client.user_type}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            client.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {client.is_active ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3 mr-1" />
                                Blocked
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(client.date_joined).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(client)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleContactClient(client)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Contact Client"
                              disabled={!client.email && !client.phone}
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(client.id, client.is_active)}
                              disabled={actionLoading === client.id}
                              className={`p-1 ${
                                client.is_active 
                                  ? 'text-red-600 hover:text-red-800' 
                                  : 'text-green-600 hover:text-green-800'
                              }`}
                              title={client.is_active ? 'Block Client' : 'Unblock Client'}
                            >
                              {actionLoading === client.id ? (
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : client.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => navigate(`/cargo/items?client=${client.id}&shipping_mark=${client.shipping_mark}`)}
                              className="text-purple-600 hover:text-purple-800 p-1"
                              title="View Cargo Items"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredClients.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No clients found</p>
                    {(searchTerm || filterStatus || filterRole || filterType) && (
                      <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Statistics */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
              <div className="space-y-3">
                {['CUSTOMER', 'STAFF', 'ADMIN', 'MANAGER'].map(role => {
                  const count = clients.filter(c => c.user_role === role).length;
                  const percentage = clients.length > 0 ? (count / clients.length * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={role} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setFilterRole(role)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {role}
                        </button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Plus className="h-6 w-6 mr-3 text-blue-600" />
                    <div>
                      <div className="font-semibold text-blue-800">Add New Client</div>
                      <div className="text-sm text-blue-600">Register a new customer or user</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/cargo/items')}
                  className="w-full bg-purple-50 border border-purple-200 rounded-lg p-4 text-left hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Eye className="h-6 w-6 mr-3 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-800">View All Cargo</div>
                      <div className="text-sm text-purple-600">Browse all cargo items</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setFilterStatus('blocked')}
                  className="w-full bg-red-50 border border-red-200 rounded-lg p-4 text-left hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center">
                    <UserX className="h-6 w-6 mr-3 text-red-600" />
                    <div>
                      <div className="font-semibold text-red-800">Blocked Clients</div>
                      <div className="text-sm text-red-600">Review suspended accounts</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Client Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </p>
                  </div>
                  {selectedClient.company_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedClient.company_name}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedClient.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedClient.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Region</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedClient.region}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shipping Mark</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{selectedClient.shipping_mark}</p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Account Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedClient.user_role === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' :
                      selectedClient.user_role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedClient.user_role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedClient.user_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedClient.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedClient.is_active ? 'Active' : 'Blocked'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Joined</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {new Date(selectedClient.date_joined).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleContactClient(selectedClient)}
                  disabled={!selectedClient.email && !selectedClient.phone}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contact
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate(`/cargo/items?client=${selectedClient.id}&shipping_mark=${selectedClient.shipping_mark}`);
                  }}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Cargo
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedClient.id, selectedClient.is_active)}
                  disabled={actionLoading === selectedClient.id}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    selectedClient.is_active 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {actionLoading === selectedClient.id ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : selectedClient.is_active ? (
                    <UserX className="h-4 w-4 mr-2" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  {selectedClient.is_active ? 'Block' : 'Unblock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Clients;
