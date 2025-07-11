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
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts';
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

  // Custom colors for charts
  const colors = {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    gray: '#6B7280'
  };

  const pieColors = [colors.warning, colors.success, colors.primary, colors.danger];

  // Prepare data for charts
  const getStatusData = () => {
    if (warehouse === 'china') {
      return [
        {
          name: 'Pending',
          value: stats.pending_count || 0,
          color: colors.warning,
          icon: Clock
        },
        {
          name: 'Ready for Shipping',
          value: stats.ready_for_shipping_count || 0,
          color: colors.success,
          icon: CheckCircle
        },
        {
          name: 'Shipped',
          value: stats.shipped_count || 0,
          color: colors.primary,
          icon: Truck
        },
        {
          name: 'Flagged',
          value: stats.flagged_count || 0,
          color: colors.danger,
          icon: AlertTriangle
        }
      ];
    } else {
      return [
        {
          name: 'Pending',
          value: stats.pending_count || 0,
          color: colors.warning,
          icon: Clock
        },
        {
          name: 'Ready for Delivery',
          value: stats.ready_for_delivery_count || 0,
          color: colors.success,
          icon: CheckCircle
        },
        {
          name: 'Delivered',
          value: stats.delivered_count || 0,
          color: colors.primary,
          icon: Truck
        },
        {
          name: 'Flagged',
          value: stats.flagged_count || 0,
          color: colors.danger,
          icon: AlertTriangle
        }
      ];
    }
  };

  const statusData = getStatusData();
  
  // Prepare metrics data for bar chart
  const metricsData = [
    {
      name: 'Items',
      value: stats.total_count || 0,
      color: colors.primary,
      unit: ''
    },
    {
      name: 'Volume',
      value: parseFloat(stats.total_cbm) || 0,
      color: colors.success,
      unit: 'm³'
    },
    {
      name: 'Weight',
      value: parseFloat(stats.total_weight) || 0,
      color: colors.info,
      unit: 'kg'
    },
    {
      name: 'Avg Days',
      value: Math.round(stats.average_days_in_warehouse) || 0,
      color: colors.warning,
      unit: 'days'
    }
  ];

  // Prepare processing efficiency data
  const efficiencyData = [
    {
      name: 'Processing Rate',
      value: stats.processing_rate || 0,
      color: colors.success
    },
    {
      name: 'On-time Rate', 
      value: stats.on_time_rate || 85, // fallback value
      color: colors.primary
    },
    {
      name: 'Error Rate',
      value: stats.error_rate || (stats.flagged_count / stats.total_count * 100) || 5,
      color: colors.danger
    }
  ];

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  const formatCurrency = (amount) => {
    return amount ? `$${parseFloat(amount).toLocaleString()}` : '$0';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}${entry.payload?.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p style={{ color: data.color }}>
            {`Count: ${data.value}`}
          </p>
          <p className="text-sm text-gray-500">
            {`${((data.value / stats.total_count) * 100).toFixed(1)}% of total`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 mb-8">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="lg:col-span-1">
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary-500" />
                Status Distribution
              </h3>
              <span className="text-sm text-gray-500">Total: {formatNumber(stats.total_count)}</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {statusData.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center text-sm">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <Icon className="h-3 w-3 mr-1" style={{ color: item.color }} />
                    <span className="text-gray-600 truncate">{item.name}</span>
                    <span className="ml-auto font-medium text-gray-900">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Warehouse Metrics Bar Chart */}
        <div className="lg:col-span-2">
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary-500" />
                Warehouse Metrics
              </h3>
              <span className="text-sm text-gray-500">{warehouse === 'china' ? 'China' : 'Ghana'} Warehouse</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]}
                    fill={(entry) => entry.color}
                  >
                    {metricsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Efficiency Radial Chart */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary-500" />
              Processing Efficiency
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="20%" 
                outerRadius="80%" 
                data={efficiencyData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar 
                  dataKey="value" 
                  cornerRadius={10} 
                  fill="#8884d8"
                >
                  {efficiencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RadialBar>
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {efficiencyData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary-500" />
              Financial Overview
            </h3>
          </div>
          <div className="space-y-6">
            {/* Total Estimated Value */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Est. Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.total_estimated_value)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Average Value per Item */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Value/Item</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.total_estimated_value / stats.total_count)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Processing Rate Indicator */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Processing</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round((stats.total_count / (stats.average_days_in_warehouse || 1)))} items/day
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      {stats.recent_activity && stats.recent_activity.length > 0 && (
        <div className="dashboard-card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-primary-500" />
              Recent Activity
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recent_activity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.item_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.action}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
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
