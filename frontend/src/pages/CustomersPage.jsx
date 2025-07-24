import { useState } from 'react';

function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  // Mock data - in real app, this would come from API
  const mockCustomers = [
    { id: 1, shippingMark: 'SM001', clientName: 'John Doe', email: 'john.doe@email.com', phone: '+1234567890', region: 'North America', status: 'Active', createdBy: 'Admin' },
    { id: 2, shippingMark: 'SM002', clientName: 'Jane Smith', email: 'jane.smith@email.com', phone: '+1234567891', region: 'Europe', status: 'Active', createdBy: 'Manager' },
    { id: 3, shippingMark: 'SM003', clientName: 'Bob Johnson', email: 'bob.johnson@email.com', phone: '+1234567892', region: 'Asia', status: 'Inactive', createdBy: 'Admin' },
    { id: 4, shippingMark: 'SM004', clientName: 'Alice Brown', email: 'alice.brown@email.com', phone: '+1234567893', region: 'Africa', status: 'Active', createdBy: 'Staff' },
    { id: 5, shippingMark: 'SM005', clientName: 'Charlie Wilson', email: 'charlie.wilson@email.com', phone: '+1234567894', region: 'South America', status: 'Active', createdBy: 'Manager' },
    { id: 6, shippingMark: 'SM006', clientName: 'Diana Davis', email: 'diana.davis@email.com', phone: '+1234567895', region: 'North America', status: 'Inactive', createdBy: 'Admin' },
    { id: 7, shippingMark: 'SM007', clientName: 'Edward Miller', email: 'edward.miller@email.com', phone: '+1234567896', region: 'Europe', status: 'Active', createdBy: 'Staff' },
    { id: 8, shippingMark: 'SM008', clientName: 'Fiona Garcia', email: 'fiona.garcia@email.com', phone: '+1234567897', region: 'Asia', status: 'Active', createdBy: 'Manager' },
    { id: 9, shippingMark: 'SM009', clientName: 'George Martinez', email: 'george.martinez@email.com', phone: '+1234567898', region: 'Africa', status: 'Active', createdBy: 'Admin' },
    { id: 10, shippingMark: 'SM010', clientName: 'Helen Rodriguez', email: 'helen.rodriguez@email.com', phone: '+1234567899', region: 'South America', status: 'Inactive', createdBy: 'Staff' }
  ];

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.shippingMark.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.id - a.id;
      case 'oldest':
        return a.id - b.id;
      case 'name':
        return a.clientName.localeCompare(b.clientName);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedCustomers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCustomers = sortedCustomers.slice(startIndex, startIndex + pageSize);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(paginatedCustomers.map(customer => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Hello, John 👋</h1>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="flex justify-center">
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
            {/* Total Customers */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xs text-gray-500 mb-1">Total Customers</div>
                <div className="text-2xl font-bold text-gray-900">5,423</div>
                <div className="text-xs text-green-600">↑ 16% this month</div>
              </div>
            </div>

            {/* Inactive Members */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xs text-gray-500 mb-1">Inactive</div>
                <div className="text-2xl font-bold text-gray-900">1,893</div>
                <div className="text-xs text-red-600">↓ 1% this month</div>
              </div>
            </div>

            {/* Blocked */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xs text-gray-500 mb-1">Blocked</div>
                <div className="text-2xl font-bold text-gray-900">189</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Clients Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">ALL CLIENTS</h2>
              <p className="text-blue-600 text-sm mt-1">ACTIVE MEMBERS</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Sort by: Oldest</option>
                <option value="name">Sort by: Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedCustomers.length === paginatedCustomers.length && paginatedCustomers.length > 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping Mark</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.shippingMark}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.clientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.region}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      customer.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.createdBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing data {startIndex + 1} to {Math.min(startIndex + pageSize, sortedCustomers.length)} of {sortedCustomers.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                &lt;
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded text-sm ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="px-3 py-1 text-sm text-gray-500">...</span>
                  <button
                    onClick={() => setCurrentPage(40)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    40
                  </button>
                </>
              )}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomersPage;
