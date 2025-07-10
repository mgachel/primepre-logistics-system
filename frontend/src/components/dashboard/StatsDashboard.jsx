import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Truck, 
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar
} from 'lucide-react';
import goodsService from '../../services/goodsService';

const StatsDashboard = ({ warehouse = 'china' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let data;
        if (warehouse === 'china') {
          data = await goodsService.getChinaStatistics();
        } else {
          data = await goodsService.getGhanaStatistics();
        }
        
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [warehouse]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (warehouse === 'china') {
        data = await goodsService.getChinaStatistics();
      } else {
        data = await goodsService.getGhanaStatistics();
      }
      
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to load statistics
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
            <div className="mt-3">
              <button
                onClick={loadStatistics}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const getStatusConfig = () => {
    if (warehouse === 'china') {
      return [
        {
          key: 'pending_count',
          label: 'Pending',
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        },
        {
          key: 'ready_for_shipping_count',
          label: 'Ready for Shipping',
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        },
        {
          key: 'shipped_count',
          label: 'Shipped',
          icon: Truck,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        },
        {
          key: 'flagged_count',
          label: 'Flagged',
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      ];
    } else {
      return [
        {
          key: 'pending_count',
          label: 'Pending',
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        },
        {
          key: 'ready_for_delivery_count',
          label: 'Ready for Delivery',
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        },
        {
          key: 'delivered_count',
          label: 'Delivered',
          icon: Truck,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        },
        {
          key: 'flagged_count',
          label: 'Flagged',
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      ];
    }
  };

  const statusCards = getStatusConfig();

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return amount ? `$${parseFloat(amount).toLocaleString()}` : '$0';
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusCards.map((card) => {
          const Icon = card.icon;
          const count = stats[card.key] || 0;
          
          return (
            <div
              key={card.key}
              className={`${card.bgColor} ${card.borderColor} border rounded-lg p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>
                    {formatNumber(count)}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.total_count)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All items in warehouse
              </p>
            </div>
            <Package className="h-8 w-8 text-gray-600" />
          </div>
        </div>

        {/* Total CBM */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_cbm ? `${parseFloat(stats.total_cbm).toFixed(2)}` : '0'} m³
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Cubic meters
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-600" />
          </div>
        </div>

        {/* Total Weight */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Weight</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_weight ? `${parseFloat(stats.total_weight).toFixed(2)}` : '0'} kg
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Kilograms
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Estimated Value */}
        {stats.total_estimated_value && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Est. Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.total_estimated_value)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Combined estimated value
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        )}

        {/* Average Days in Warehouse */}
        {stats.average_days_in_warehouse && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Days</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.average_days_in_warehouse)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Days in warehouse
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        )}

        {/* Processing Rate */}
        {stats.processing_rate !== undefined && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(stats.processing_rate)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Items processed
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {stats.recent_activity && stats.recent_activity.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Recent Activity
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats.recent_activity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.item_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.action}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
