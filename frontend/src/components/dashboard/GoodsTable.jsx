import React, { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  MoreVertical, 
  Calendar,
  Package,
  MapPin,
  User,
  Eye,
  ArrowUpDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { StatusBadge, StatusProgress } from './StatusComponents';

const GoodsTable = ({ 
  goods = [], 
  loading = false, 
  onEdit, 
  onDelete, 
  onStatusUpdate,
  onBulkStatusUpdate,
  warehouse = 'china',
  showSelection = false
}) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = () => {
    if (!Array.isArray(goods)) return;
    
    if (selectedItems.size === goods.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(goods.map(item => item.id)));
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAction = (status) => {
    if (selectedItems.size > 0 && onBulkStatusUpdate) {
      onBulkStatusUpdate(Array.from(selectedItems), status);
      setSelectedItems(new Set());
    }
  };

  const toggleRowExpansion = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const sortedGoods = React.useMemo(() => {
    if (!Array.isArray(goods) || !sortConfig.key) return Array.isArray(goods) ? goods : [];

    return [...goods].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [goods, sortConfig]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return amount ? `$${parseFloat(amount).toLocaleString()}` : '-';
  };

  const SortButton = ({ column, label }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-600"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-4 w-4" />
    </button>
  );

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4 mb-3">
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Bulk Actions */}
      {showSelection && selectedItems.size > 0 && (
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedItems.size} item(s) selected
            </span>
            <div className="flex space-x-2">
              {warehouse === 'china' ? (
                <>
                  <button
                    onClick={() => handleBulkAction('READY_FOR_SHIPPING')}
                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded"
                  >
                    Mark Ready
                  </button>
                  <button
                    onClick={() => handleBulkAction('FLAGGED')}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
                  >
                    Flag Items
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleBulkAction('READY_FOR_DELIVERY')}
                    className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded"
                  >
                    Mark Ready
                  </button>
                  <button
                    onClick={() => handleBulkAction('FLAGGED')}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
                  >
                    Flag Items
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showSelection && (
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {selectedItems.size === goods.length ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="item_id" label="Item ID" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="shipping_mark" label="Shipping Mark" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="cbm" label="CBM" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="weight" label="Weight" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton column="date_received" label="Date Received" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedGoods.map((item) => (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-gray-50">
                  {showSelection && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSelectItem(item.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.item_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.supply_tracking}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.shipping_mark}
                    </div>
                    {item.supplier_name && (
                      <div className="text-sm text-gray-500">
                        {item.supplier_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.cbm} m³
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.weight ? `${item.weight} kg` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      {formatDate(item.date_received)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleRowExpansion(item.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <div className="relative">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded Row */}
                {expandedRows.has(item.id) && (
                  <tr>
                    <td colSpan={showSelection ? 8 : 7} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <StatusProgress status={item.status} warehouse={warehouse} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <div className="flex items-center mt-1">
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              {item.location}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Quantity:</span>
                            <div className="mt-1">{item.quantity} pieces</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Method:</span>
                            <div className="mt-1">{item.method_of_shipping}</div>
                          </div>
                          {item.estimated_value && (
                            <div>
                              <span className="font-medium text-gray-700">Est. Value:</span>
                              <div className="mt-1">{formatCurrency(item.estimated_value)}</div>
                            </div>
                          )}
                          {item.description && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-700">Description:</span>
                              <div className="mt-1">{item.description}</div>
                            </div>
                          )}
                          {item.notes && (
                            <div className="md:col-span-3">
                              <span className="font-medium text-gray-700">Notes:</span>
                              <div className="mt-1 text-gray-600">{item.notes}</div>
                            </div>
                          )}
                        </div>

                        {onStatusUpdate && (
                          <div className="flex space-x-2 pt-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                            {warehouse === 'china' ? (
                              <>
                                {item.status === 'PENDING' && (
                                  <button
                                    onClick={() => onStatusUpdate(item.id, 'READY_FOR_SHIPPING')}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    Mark Ready
                                  </button>
                                )}
                                {item.status === 'READY_FOR_SHIPPING' && (
                                  <button
                                    onClick={() => onStatusUpdate(item.id, 'SHIPPED')}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  >
                                    Mark Shipped
                                  </button>
                                )}
                                {item.status !== 'FLAGGED' && (
                                  <button
                                    onClick={() => onStatusUpdate(item.id, 'FLAGGED')}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Flag Item
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {item.status === 'PENDING' && (
                                  <button
                                    onClick={() => onStatusUpdate(item.id, 'READY_FOR_DELIVERY')}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    Mark Ready
                                  </button>
                                )}
                                {item.status === 'READY_FOR_DELIVERY' && (
                                  <button
                                    onClick={() => onStatusUpdate(item.id, 'DELIVERED')}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  >
                                    Mark Delivered
                                  </button>
                                )}
                                {item.status !== 'FLAGGED' && (
                                  <button
                                    onClick={() => onStatusUpdate(item.id, 'FLAGGED')}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Flag Item
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {goods.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No goods found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding some goods or adjusting your filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default GoodsTable;
