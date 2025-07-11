import React, { useState, useEffect } from 'react';
import { ArrowRight, Building2, Ship, AlertTriangle, Clock, TrendingUp, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import goodsService from '../services/goodsService';

const OverviewDashboard = () => {
  const [chinaStats, setChinaStats] = useState(null);
  const [ghanaStats, setGhanaStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllStatistics();
  }, []);

  const loadAllStatistics = async () => {
    try {
      setLoading(true);
      const [chinaData, ghanaData] = await Promise.all([
        goodsService.getChinaStatistics(),
        goodsService.getGhanaStatistics()
      ]);
      setChinaStats(chinaData);
      setGhanaStats(ghanaData);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const warehouseComparisonData = [
    {
      name: 'Pending',
      China: chinaStats?.pending_count || 0,
      Ghana: ghanaStats?.pending_count || 0,
    },
    {
      name: 'Ready',
      China: chinaStats?.ready_for_shipping_count || 0,
      Ghana: ghanaStats?.ready_for_delivery_count || 0,
    },
    {
      name: 'Shipped/Delivered',
      China: chinaStats?.shipped_count || 0,
      Ghana: ghanaStats?.delivered_count || 0,
    },
    {
      name: 'Flagged',
      China: chinaStats?.flagged_count || 0,
      Ghana: ghanaStats?.flagged_count || 0,
    },
  ];

  const totalItemsData = [
    {
      name: 'China Warehouse',
      value: chinaStats?.total_count || 0,
      color: '#3B82F6',
    },
    {
      name: 'Ghana Warehouse',
      value: ghanaStats?.total_count || 0,
      color: '#10B981',
    },
  ];

  const statusDistributionData = [
    {
      name: 'Pending',
      value: (chinaStats?.pending_count || 0) + (ghanaStats?.pending_count || 0),
      color: '#F59E0B',
    },
    {
      name: 'Ready',
      value: (chinaStats?.ready_for_shipping_count || 0) + (ghanaStats?.ready_for_delivery_count || 0),
      color: '#10B981',
    },
    {
      name: 'Shipped/Delivered',
      value: (chinaStats?.shipped_count || 0) + (ghanaStats?.delivered_count || 0),
      color: '#3B82F6',
    },
    {
      name: 'Flagged',
      value: (chinaStats?.flagged_count || 0) + (ghanaStats?.flagged_count || 0),
      color: '#EF4444',
    },
  ];

  const capacityData = [
    {
      name: 'China',
      CBM: parseFloat(chinaStats?.total_cbm || 0),
      Weight: parseFloat(chinaStats?.total_weight || 0) / 1000, // Convert to tons
    },
    {
      name: 'Ghana',
      CBM: parseFloat(ghanaStats?.total_cbm || 0),
      Weight: parseFloat(ghanaStats?.total_weight || 0) / 1000, // Convert to tons
    },
  ];

  const MetricCard = ({ title, value, subtitle, icon, color, change, href }) => {
    const IconComponent = icon;
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${color}`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>
          {change && (
            <div className={`text-right ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="h-4 w-4 mx-auto" />
              <span className="text-sm font-medium">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        {href && (
          <Link 
            to={href}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            View Details <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Overview Dashboard">
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalItems = (chinaStats?.total_count || 0) + (ghanaStats?.total_count || 0);
  const totalCBM = (parseFloat(chinaStats?.total_cbm || 0) + parseFloat(ghanaStats?.total_cbm || 0)).toFixed(2);
  const totalWeight = (parseFloat(chinaStats?.total_weight || 0) + parseFloat(ghanaStats?.total_weight || 0)).toFixed(2);
  const totalPending = (chinaStats?.pending_count || 0) + (ghanaStats?.pending_count || 0);

  return (
    <DashboardLayout title="Overview Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Welcome to PrimePre Logistics</h1>
            <p className="text-blue-100 text-lg">
              Advanced analytics and monitoring for your global logistics operations
            </p>
          </div>
          <div className="absolute top-0 right-0 -mt-4 -mr-16 opacity-20">
            <Building2 className="h-32 w-32" />
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Items"
            value={totalItems.toLocaleString()}
            subtitle="Across all warehouses"
            icon={Package}
            color="bg-blue-500"
            href="/dashboard/overview"
          />
          <MetricCard
            title="Pending Items"
            value={totalPending.toLocaleString()}
            subtitle="Awaiting processing"
            icon={Clock}
            color="bg-yellow-500"
            href="/dashboard/overdue"
          />
          <MetricCard
            title="Total Volume"
            value={`${totalCBM} m³`}
            subtitle="Cubic meters"
            icon={Building2}
            color="bg-green-500"
          />
          <MetricCard
            title="Total Weight"
            value={`${totalWeight} kg`}
            subtitle="Kilograms"
            icon={Ship}
            color="bg-purple-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Warehouse Comparison Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Warehouse Comparison</h3>
              <div className="text-sm text-gray-500">Items by status</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={warehouseComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="China" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ghana" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
              <div className="text-sm text-gray-500">All items</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Total Items by Warehouse */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Items by Warehouse</h3>
              <div className="text-sm text-gray-500">Total distribution</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={totalItemsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {totalItemsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Capacity Analysis */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Capacity Analysis</h3>
              <div className="text-sm text-gray-500">CBM vs Weight (tons)</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={capacityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => [
                    name === 'CBM' ? `${value} m³` : `${value} tons`,
                    name === 'CBM' ? 'Volume' : 'Weight'
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="CBM"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Weight"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/dashboard/china"
              className="group flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
            >
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="font-medium text-gray-900">China Warehouse</div>
                <div className="text-sm text-gray-500">Manage China operations</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto group-hover:text-blue-600 transition-colors" />
            </Link>
            
            <Link
              to="/dashboard/ghana"
              className="group flex items-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all duration-200"
            >
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="font-medium text-gray-900">Ghana Warehouse</div>
                <div className="text-sm text-gray-500">Manage Ghana operations</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto group-hover:text-green-600 transition-colors" />
            </Link>
            
            <Link
              to="/dashboard/overdue"
              className="group flex items-center p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200"
            >
              <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="font-medium text-gray-900">Overdue Items</div>
                <div className="text-sm text-gray-500">Review pending items</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto group-hover:text-yellow-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OverviewDashboard;
