import React, { useState, useEffect } from 'react';
import { ArrowRight, Building2, Ship, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatsDashboard from '../components/dashboard/StatsDashboard';
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

  const QuickStatsCard = ({ title, chinaValue, ghanaValue, icon: Icon, color, href }) => (
    <Link 
      to={href}
      className={`block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 ${color}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-1 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">China:</span>
              <span className="text-lg font-semibold text-gray-900">
                {chinaValue || 0}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Ghana:</span>
              <span className="text-lg font-semibold text-gray-900">
                {ghanaValue || 0}
              </span>
            </div>
          </div>
        </div>
        <Icon className={`h-8 w-8 text-${color.replace('border-l-', '').replace('-400', '-600')}`} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">View details</span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </Link>
  );

  const WarehouseCard = ({ warehouse, stats, href }) => {
    if (!stats) return null;

    const isChina = warehouse === 'china';
    const readyKey = isChina ? 'ready_for_shipping_count' : 'ready_for_delivery_count';
    const shippedKey = isChina ? 'shipped_count' : 'delivered_count';

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              {warehouse === 'china' ? 'China' : 'Ghana'} Warehouse
            </h3>
          </div>
          <Link 
            to={href}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending_count || 0}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats[readyKey] || 0}
            </div>
            <div className="text-sm text-gray-600">
              {isChina ? 'Ready to Ship' : 'Ready for Delivery'}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats[shippedKey] || 0}
            </div>
            <div className="text-sm text-gray-600">
              {isChina ? 'Shipped' : 'Delivered'}
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats.flagged_count || 0}
            </div>
            <div className="text-sm text-gray-600">Flagged</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Total Items:</span>
              <span className="font-medium">{stats.total_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Total CBM:</span>
              <span className="font-medium">
                {stats.total_cbm ? `${parseFloat(stats.total_cbm).toFixed(2)} m³` : '0 m³'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Weight:</span>
              <span className="font-medium">
                {stats.total_weight ? `${parseFloat(stats.total_weight).toFixed(2)} kg` : '0 kg'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Overview">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Overview">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome to PrimePre Logistics</h2>
          <p className="text-blue-100">
            Monitor and manage your goods across China and Ghana warehouses
          </p>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickStatsCard
            title="Pending Items"
            chinaValue={chinaStats?.pending_count}
            ghanaValue={ghanaStats?.pending_count}
            icon={Clock}
            color="border-l-yellow-400"
            href="/dashboard/overview"
          />
          <QuickStatsCard
            title="Ready for Shipping"
            chinaValue={chinaStats?.ready_for_shipping_count}
            ghanaValue={ghanaStats?.ready_for_delivery_count}
            icon={Ship}
            color="border-l-green-400"
            href="/dashboard/ready-shipping"
          />
          <QuickStatsCard
            title="Flagged Items"
            chinaValue={chinaStats?.flagged_count}
            ghanaValue={ghanaStats?.flagged_count}
            icon={AlertTriangle}
            color="border-l-red-400"
            href="/dashboard/flagged"
          />
          <QuickStatsCard
            title="Total Items"
            chinaValue={chinaStats?.total_count}
            ghanaValue={ghanaStats?.total_count}
            icon={Building2}
            color="border-l-blue-400"
            href="/dashboard/overview"
          />
        </div>

        {/* Warehouse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WarehouseCard 
            warehouse="china" 
            stats={chinaStats} 
            href="/dashboard/china"
          />
          <WarehouseCard 
            warehouse="ghana" 
            stats={ghanaStats} 
            href="/dashboard/ghana"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/dashboard/china"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Manage China Warehouse</div>
                <div className="text-sm text-gray-500">View and update China goods</div>
              </div>
            </Link>
            <Link
              to="/dashboard/ghana"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Manage Ghana Warehouse</div>
                <div className="text-sm text-gray-500">View and update Ghana goods</div>
              </div>
            </Link>
            <Link
              to="/dashboard/ready-shipping"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Ship className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Ready for Shipping</div>
                <div className="text-sm text-gray-500">Items ready to ship</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OverviewDashboard;
