function RatesPage() {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Shipping Rates</h2>
          <p className="text-sm sm:text-base text-gray-600">
            View and manage shipping rates here. This page will be created later.
          </p>
        </div>
        
        {/* Rate Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 17v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1H4z"/>
                  <path d="M5.5 14h13l1.5-2h-16z"/>
                  <path d="M12 2l2 8-2 2-2-2z"/>
                  <path d="M4 12l2-6h12l2 6z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600">Sea Freight</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900">$0.00</p>
                <p className="text-xs text-blue-600">per kg</p>
              </div>
            </div>
          </div>
          
          <div className="bg-sky-50 rounded-lg p-3 sm:p-4 border border-sky-200">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sky-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-sky-600">Air Freight</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-sky-900">$0.00</p>
                <p className="text-xs text-sky-600">per kg</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600">Local Delivery</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900">$0.00</p>
                <p className="text-xs text-green-600">per delivery</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Coming Soon */}
      <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 lg:p-12">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2">Shipping Rates Management</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
            Complete rate management system is coming soon. Configure shipping rates, manage pricing tiers, and calculate costs automatically.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
            💰 Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

export default RatesPage;
