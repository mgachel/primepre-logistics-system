import { useAuth } from "../hooks/useAuth";

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h2>
        <p className="text-sm sm:text-base text-gray-600">
          This is your logistics management dashboard. More features will be added soon.
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">Profile</h3>
              <p className="text-xs sm:text-sm text-gray-500">Manage your account</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
            <p className="text-xs sm:text-sm truncate"><span className="font-medium">Name:</span> {user?.first_name} {user?.last_name}</p>
            <p className="text-xs sm:text-sm truncate"><span className="font-medium">Phone:</span> {user?.phone}</p>
            <p className="text-xs sm:text-sm truncate"><span className="font-medium">Email:</span> {user?.email}</p>
            <p className="text-xs sm:text-sm truncate"><span className="font-medium">Region:</span> {user?.region}</p>
            <p className="text-xs sm:text-sm truncate"><span className="font-medium">Type:</span> {user?.user_type}</p>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">Quick Actions</h3>
              <p className="text-xs sm:text-sm text-gray-500">Coming soon</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm text-gray-600">
              Logistics management features will be available here.
            </p>
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 sm:ml-4 min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">System Status</h3>
              <p className="text-xs sm:text-sm text-gray-500">All systems operational</p>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-center">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs sm:text-sm text-gray-600">Authentication: Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="text-sm text-gray-500 text-center py-4 sm:py-8">
            No recent activity to display. Start using the system to see your activity here.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
