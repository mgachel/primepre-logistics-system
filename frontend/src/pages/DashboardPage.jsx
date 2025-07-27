import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { dashBoardService } from "../services/dashBoardService";

function DashboardPage() {
  const { user, getToken } = useAuth();
  const [summaryStats, setSummaryStats] = useState([]);
  const [clientDistribution, setClientDistribution] = useState({ total: 0, change: 0, new: 0, inactive: 0, blocked: 0 });
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const cargoData = await dashBoardService.getCargoDashboard('sea', token);
        const userStats = await dashBoardService.getUserStatistics(token);
        setSummaryStats([
          {
            label: "Goods Received",
            value: cargoData.total_cargo_items,
            change: 18,
            icon: (
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
          },
          {
            label: "In Transit",
            value: cargoData.containers_in_transit,
            change: 16,
            icon: (
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
          },
          {
            label: "Total Clients",
            value: userStats.customer_users,
            change: 18,
            icon: (
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 0A4 4 0 0012 4a4 4 0 00-1 7.87" />
              </svg>
            ),
          },
        ]);
        setClientDistribution({
          total: userStats.customer_users,
          change: 16,
          new: 3200,
          inactive: 1800,
          blocked: 423,
        });
        setCargos(
          (cargoData.recent_containers || []).map((container) => ({
            id: container.container_id,
            type: container.cargo_type,
            location: container.route || "-",
            loadingDate: container.load_date,
            eta: container.eta,
          }))
        );
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8 bg-[#f7f8fa] min-h-screen">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {summaryStats.map((stat, idx) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow flex flex-col items-start px-8 py-6 relative min-h-[120px]">
            <div className="flex items-center gap-3 mb-2">
              {stat.icon}
              <span className="ml-2 text-gray-400 font-semibold text-xs bg-gray-100 rounded px-2 py-0.5">SEA</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value?.toLocaleString?.() ?? stat.value}</div>
            <div className="flex items-center gap-1 text-blue-500 text-sm font-semibold mt-1">
              <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{stat.change}%</span>
              <span className="text-gray-500 font-normal ml-1">this month</span>
            </div>
            <div className="mt-2 text-gray-700 font-medium text-base">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Middle row: Client Distribution & Ghana Warehouse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Client Distribution */}
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col min-h-[220px]">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-lg font-semibold text-gray-900">Client Distribution</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{clientDistribution.total?.toLocaleString?.() ?? clientDistribution.total}</div>
          <div className="flex items-center gap-1 text-blue-500 text-sm font-semibold mb-1">
            <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{clientDistribution.change}%</span>
            <span className="text-gray-500 font-normal ml-1">this month</span>
          </div>
          <div className="text-gray-500 text-base mb-4">Total Active Clients</div>
          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span> New Clients
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span> Inactive Clients
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span> blocked Clients
            </div>
          </div>
        </div>
        {/* Ghana Warehouse (placeholder) */}
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col min-h-[220px]">
          <div className="text-lg font-semibold text-gray-900 mb-4">Ghana Warehouse</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 font-medium text-gray-700">container id</th>
                  <th className="py-2 px-4 font-medium text-gray-700">Type</th>
                  <th className="py-2 px-4 font-medium text-gray-700">Current Location</th>
                  <th className="py-2 px-4 font-medium text-gray-700">Loading Date</th>
                  <th className="py-2 px-4 font-medium text-gray-700">ETA</th>
                </tr>
              </thead>
              <tbody>
                {/* Placeholder: No data */}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transiting Cargos Table */}
      <div className="bg-white rounded-2xl shadow p-8">
        <div className="text-xl font-semibold text-gray-900 mb-4">Transiting Cargos</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 font-medium text-gray-700">container id</th>
                <th className="py-2 px-4 font-medium text-gray-700">Type</th>
                <th className="py-2 px-4 font-medium text-gray-700">Current Location</th>
                <th className="py-2 px-4 font-medium text-gray-700">Loading Date</th>
                <th className="py-2 px-4 font-medium text-gray-700">ETA</th>
              </tr>
            </thead>
            <tbody>
              {cargos.map((cargo) => (
                <tr key={cargo.id} className="border-b last:border-0">
                  <td className="py-2 px-4">{cargo.id}</td>
                  <td className="py-2 px-4">{cargo.type}</td>
                  <td className="py-2 px-4">{cargo.location}</td>
                  <td className="py-2 px-4">{cargo.loadingDate}</td>
                  <td className="py-2 px-4">{cargo.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
