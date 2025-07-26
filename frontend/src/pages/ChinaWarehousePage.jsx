function ChinaWarehousePage() {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">China Warehouse - Goods Received</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Track goods received at the China warehouse. This page will be created later.
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-600">Items Received</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-yellow-600">Processing</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600">Ready to Ship</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600">Shipped</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Coming Soon */}
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 lg:p-12">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2">China Warehouse Management</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
            Complete warehouse management system is coming soon. Track inventory, manage goods received, and coordinate international shipping.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            🏭 Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChinaWarehousePage;
