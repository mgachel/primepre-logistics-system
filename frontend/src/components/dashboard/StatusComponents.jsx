import React from 'react';
import { Clock, CheckCircle, AlertTriangle, Truck, XCircle, Package } from 'lucide-react';

const StatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const getStatusConfig = (status) => {
    const configs = {
      'PENDING': {
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
        label: 'Pending'
      },
      'PROCESSING': {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Package,
        label: 'Processing'
      },
      'READY': {
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        label: 'Ready'
      },
      'READY_FOR_SHIPPING': {
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        label: 'Ready for Shipping'
      },
      'READY_FOR_DELIVERY': {
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
        label: 'Ready for Delivery'
      },
      'SHIPPED': {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Truck,
        label: 'Shipped'
      },
      'DELIVERED': {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: Truck,
        label: 'Delivered'
      },
      'FLAGGED': {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertTriangle,
        label: 'Flagged'
      },
      'CANCELLED': {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: XCircle,
        label: 'Cancelled'
      }
    };
    
    return configs[status] || {
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: Package,
      label: status
    };
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    'sm': 'px-2 py-0.5 text-xs',
    'md': 'px-2.5 py-1 text-xs',
    'lg': 'px-3 py-1.5 text-sm'
  };

  const iconSizes = {
    'sm': 'h-3 w-3',
    'md': 'h-3.5 w-3.5',
    'lg': 'h-4 w-4'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${config.color} ${sizeClasses[size]} shadow-sm`}>
      {showIcon && (
        <Icon className={`${iconSizes[size]} mr-1`} strokeWidth={2} />
      )}
      {config.label}
    </span>
  );
};

const StatusProgress = ({ status, warehouse = 'china' }) => {
  const getSteps = (warehouse) => {
    if (warehouse === 'china') {
      return [
        { key: 'PENDING', label: 'Pending', description: 'Item received' },
        { key: 'READY_FOR_SHIPPING', label: 'Ready', description: 'Ready for shipping' },
        { key: 'SHIPPED', label: 'Shipped', description: 'Item shipped' }
      ];
    } else {
      return [
        { key: 'PENDING', label: 'Pending', description: 'Item received' },
        { key: 'READY_FOR_DELIVERY', label: 'Ready', description: 'Ready for delivery' },
        { key: 'DELIVERED', label: 'Delivered', description: 'Item delivered' }
      ];
    }
  };

  const steps = getSteps(warehouse);
  const currentStepIndex = steps.findIndex(step => step.key === status);
  const isCompleted = status === 'SHIPPED' || status === 'DELIVERED';
  const isCancelled = status === 'CANCELLED';
  const isFlagged = status === 'FLAGGED';

  if (isCancelled || isFlagged) {
    return (
      <div className="flex items-center space-x-2">
        <StatusBadge status={status} />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isPast = index < currentStepIndex;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  isActive || isPast
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isPast || (isActive && isCompleted) ? (
                  <CheckCircle className="h-5 w-5 text-white" />
                ) : (
                  <span
                    className={`text-sm font-medium ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="ml-2">
                <div
                  className={`text-sm font-medium ${
                    isActive || isPast ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
            {!isLast && (
              <div
                className={`mx-4 h-0.5 w-12 ${
                  isPast ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const StatusFilter = ({ currentStatus, onStatusChange, warehouse = 'china' }) => {
  const getStatuses = (warehouse) => {
    if (warehouse === 'china') {
      return [
        { value: '', label: 'All Status' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'READY_FOR_SHIPPING', label: 'Ready for Shipping' },
        { value: 'SHIPPED', label: 'Shipped' },
        { value: 'FLAGGED', label: 'Flagged' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ];
    } else {
      return [
        { value: '', label: 'All Status' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'READY_FOR_DELIVERY', label: 'Ready for Delivery' },
        { value: 'DELIVERED', label: 'Delivered' },
        { value: 'FLAGGED', label: 'Flagged' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ];
    }
  };

  const statuses = getStatuses(warehouse);

  return (
    <select
      value={currentStatus}
      onChange={(e) => onStatusChange(e.target.value)}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
    >
      {statuses.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  );
};

export { StatusBadge, StatusProgress, StatusFilter };
