import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { dashBoardService } from "../services/dashBoardService";

function DashboardPage() {
  const { getToken } = useAuth();
  const [summaryStats, setSummaryStats] = useState([]);
  const [clientDistribution, setClientDistribution] = useState({
    total: 0,
    change: 0,
    new: 0,
    inactive: 0,
    blocked: 0,
  });
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const cargoData = await dashBoardService.getCargoDashboard(
          "sea",
          token
        );
        const userStats = await dashBoardService.getUserStatistics(token);
        const prevGoods = cargoData.previous_total_cargo_items || 0;
        const prevTransit = cargoData.previous_containers_in_transit || 0;
        const prevClients = userStats.previous_customer_users || 0;
        const calcChange = (current, prev) => {
          if (prev === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - prev) / prev) * 100);
        };
        setSummaryStats([
          {
            label: "Goods Received",
            value: cargoData.total_cargo_items,
            change: calcChange(cargoData.total_cargo_items, prevGoods),
            icon: (
              // Box/package icon
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="3"
                  y="7"
                  width="18"
                  height="13"
                  rx="2"
                  strokeWidth="2"
                />
                <path d="M16 3v4M8 3v4M3 7l9 6 9-6" strokeWidth="2" />
              </svg>
            ),
          },
          {
            label: "In Transit",
            value: cargoData.containers_in_transit,
            change: calcChange(cargoData.containers_in_transit, prevTransit),
            icon: (
              // Truck icon
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="1"
                  y="7"
                  width="15"
                  height="10"
                  rx="2"
                  strokeWidth="2"
                />
                <path
                  d="M16 17h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2"
                  strokeWidth="2"
                />
                <circle cx="5.5" cy="17.5" r="1.5" />
                <circle cx="17.5" cy="17.5" r="1.5" />
              </svg>
            ),
          },
          {
            label: "Total Clients",
            value: userStats.customer_users,
            change: calcChange(userStats.customer_users, prevClients),
            icon: (
              // Group/people icon
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="8" cy="8" r="3" strokeWidth="2" />
                <circle cx="16" cy="8" r="3" strokeWidth="2" />
                <path
                  d="M2 21v-2a4 4 0 014-4h2a4 4 0 014 4v2"
                  strokeWidth="2"
                />
                <path
                  d="M14 21v-2a4 4 0 014-4h2a4 4 0 014 4v2"
                  strokeWidth="2"
                />
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
    return (
      <div className="text-center py-10 text-gray-500">
        Loading dashboard...
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8 bg-[#f7f8fa] min-h-screen">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl shadow flex flex-col items-start px-8 py-6 relative min-h-[120px]"
          >
            <div className="flex items-center gap-3 mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-gray-900">
              {stat.value?.toLocaleString?.() ?? stat.value}
            </div>
            <div className="flex items-center gap-1 text-blue-500 text-sm font-semibold mt-1">
              <svg
                className="w-4 h-4 inline-block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              <span>{stat.change}%</span>
              <span className="text-gray-500 font-normal ml-1">this month</span>
            </div>
            <div className="mt-2 text-gray-700 font-medium text-base">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: Client Distribution & Ghana Warehouse */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Client Distribution */}
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col min-h-[220px]">
          <div className="flex items-center gap-3 mb-2">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-lg font-semibold text-gray-900">
              Client Distribution
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {clientDistribution.total?.toLocaleString?.() ??
              clientDistribution.total}
          </div>
          <div className="flex items-center gap-1 text-blue-500 text-sm font-semibold mb-1">
            <svg
              className="w-4 h-4 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            <span>{clientDistribution.change}%</span>
            <span className="text-gray-500 font-normal ml-1">this month</span>
          </div>
          <div className="text-gray-500 text-base mb-4">
            Total Active Clients
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>{" "}
              New Clients
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>{" "}
              Inactive Clients
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>{" "}
              blocked Clients
            </div>
          </div>
        </div>
        {/* Ghana Warehouse (placeholder) */}
        <div className="bg-white rounded-2xl shadow p-8 flex flex-col min-h-[220px]">
          <div className="text-lg font-semibold text-gray-900 mb-4">
            Ghana Warehouse
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 font-medium text-gray-700">
                    container id
                  </th>
                  <th className="py-2 px-4 font-medium text-gray-700">Type</th>
                  <th className="py-2 px-4 font-medium text-gray-700">
                    Current Location
                  </th>
                  <th className="py-2 px-4 font-medium text-gray-700">
                    Loading Date
                  </th>
                  <th className="py-2 px-4 font-medium text-gray-700">ETA</th>
                </tr>
              </thead>
              <tbody>{/* Placeholder: No data */}</tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transiting Cargos Table */}
      <div className="bg-white rounded-2xl shadow p-8">
        <div className="text-xl font-semibold text-gray-900 mb-4">
          Transiting Cargos
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 font-medium text-gray-700">
                  container id
                </th>
                <th className="py-2 px-4 font-medium text-gray-700">Type</th>
                <th className="py-2 px-4 font-medium text-gray-700">
                  Current Location
                </th>
                <th className="py-2 px-4 font-medium text-gray-700">
                  Loading Date
                </th>
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
