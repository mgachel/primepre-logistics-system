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
          <div key={i} className="dashboard-card p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-9 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="flex items-center mt-4">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="ml-2 h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-50 border border-danger-200 rounded-lg p-5 mb-8 shadow-sm">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-danger-500 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-danger-700">
              Failed to load statistics
            </h3>
            <div className="mt-2 text-sm text-danger-600">
              {error}
            </div>
            <div className="mt-3">
              <button
                onClick={loadStatistics}
                className="inline-flex items-center text-sm bg-white border border-danger-300 hover:bg-danger-50 text-danger-700 px-3 py-1.5 rounded-md transition-colors shadow-sm font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
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
    <div className="space-y-8 mb-8">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusCards.map((card) => {
          const Icon = card.icon;
          const count = stats[card.key] || 0;
          const statusKey = card.key.replace('_count', '');
          const percentOfTotal = stats.total_count ? ((count / stats.total_count) * 100) : 0;
          
          return (
            <div
              key={card.key}
              className="dashboard-card p-6"
            >
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} strokeWidth={2} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatNumber(count)}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${card.key === 'flagged_count' ? 'bg-red-500' : 
                                        card.key === 'shipped_count' || card.key === 'delivered_count' ? 'bg-blue-500' : 
                                        card.key.includes('ready') ? 'bg-green-500' : 'bg-yellow-500'}`} 
                    style={{ width: `${percentOfTotal > 0 ? Math.max(percentOfTotal, 3) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-between">
                  <span>{formatPercentage(percentOfTotal)} of total</span>
                  <span className="flex items-center">
                    <Eye className="h-3 w-3 mr-1 text-gray-400" />
                    <a href="#" className="text-primary-500 hover:text-primary-700">View all</a>
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Items */}
        <div className="dashboard-card p-6">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(stats.total_count)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">All items in warehouse</span>
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Total CBM */}
        <div className="dashboard-card p-6">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Volume</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total_cbm ? `${parseFloat(stats.total_cbm).toFixed(2)}` : '0'} m³
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Cubic meters</span>
            {stats.total_cbm_change && (
              <span className={`flex items-center ${stats.total_cbm_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.total_cbm_change > 0 ? '+' : ''}{stats.total_cbm_change.toFixed(2)}% 
                {stats.total_cbm_change > 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
              </span>
            )}
          </div>
        </div>

        {/* Total Weight */}
        <div className="dashboard-card p-6">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Weight</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total_weight ? `${parseFloat(stats.total_weight).toFixed(2)}` : '0'} kg
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Kilograms</span>
            {stats.total_weight_change && (
              <span className={`flex items-center ${stats.total_weight_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.total_weight_change > 0 ? '+' : ''}{stats.total_weight_change.toFixed(2)}% 
                {stats.total_weight_change > 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
              </span>
            )}
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
