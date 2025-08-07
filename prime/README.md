# Prime Pre Logistics - Frontend

A modern logistics management system built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Dashboard**: Real-time overview of logistics operations
- **Sea Cargo Management**: Track and manage sea freight shipments
- **Air Cargo Management**: Handle air freight operations
- **Client Management**: Manage client information and relationships
- **Warehouse Management**: Track inventory in China and Ghana warehouses
- **Admin Management**: User and role management system
- **Notifications**: Real-time system alerts and updates
- **Claims Management**: Handle package claim requests
- **Shipping Rates**: Configure and manage shipping rates

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + Custom Hooks
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Package Manager**: npm/bun

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── dialogs/        # Modal dialogs
│   ├── layout/         # Layout components
│   └── ui/            # Base UI components (shadcn/ui)
├── contexts/           # React contexts
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── services/          # API services
└── lib/              # Utility functions
```

## 🔧 API Integration

The application is now ready for backend integration with the following API services:

### Authentication Service (`src/services/authService.ts`)
- User login/logout
- Token management
- User session handling

### Cargo Service (`src/services/cargoService.ts`)
- Sea and air cargo management
- Cargo tracking and status updates
- Cargo statistics

### Client Service (`src/services/clientService.ts`)
- Client CRUD operations
- Client statistics
- Client shipment history

### Admin Service (`src/services/adminService.ts`)
- User management
- Role management
- Admin statistics

### Warehouse Service (`src/services/warehouseService.ts`)
- Inventory management
- Import/export functionality
- Stock alerts

### Notification Service (`src/services/notificationService.ts`)
- System notifications
- Real-time alerts
- Notification management

### Dashboard Service (`src/services/dashboardService.ts`)
- Dashboard statistics
- Real-time data
- Quick stats

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd prime
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API configuration:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

4. Start the development server:
```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

## 🔌 Backend API Requirements

The frontend expects the following API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Cargo Management
- `GET /api/cargo` - Get all cargo with filters
- `GET /api/cargo/:id` - Get cargo by ID
- `POST /api/cargo` - Create new cargo
- `PUT /api/cargo/:id` - Update cargo
- `DELETE /api/cargo/:id` - Delete cargo
- `GET /api/cargo/stats` - Get cargo statistics

### Client Management
- `GET /api/clients` - Get all clients with filters
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/stats` - Get client statistics

### Admin Management
- `GET /api/admin/users` - Get all admin users
- `GET /api/admin/users/:id` - Get admin by ID
- `POST /api/admin/users` - Create new admin
- `PUT /api/admin/users/:id` - Update admin
- `DELETE /api/admin/users/:id` - Delete admin
- `GET /api/admin/roles` - Get all roles
- `GET /api/admin/stats` - Get admin statistics

### Warehouse Management
- `GET /api/warehouse/items` - Get warehouse items
- `GET /api/warehouse/items/:id` - Get item by ID
- `POST /api/warehouse/items` - Create new item
- `PUT /api/warehouse/items/:id` - Update item
- `DELETE /api/warehouse/items/:id` - Delete item
- `GET /api/warehouse/stats` - Get warehouse statistics
- `POST /api/warehouse/import` - Import warehouse data
- `GET /api/warehouse/export` - Export warehouse data

### Notifications
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/:id/unread` - Mark as unread
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications` - Create notification

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/transiting-cargo` - Get transiting cargo
- `GET /api/dashboard/recent-activity` - Get recent activity

## 🔄 Data Flow

1. **API Calls**: All API calls are handled through service functions
2. **State Management**: React hooks manage component state
3. **Error Handling**: Comprehensive error handling with user feedback
4. **Loading States**: Loading indicators for better UX
5. **Real-time Updates**: Ready for WebSocket integration

## 🎨 UI Components

The application uses shadcn/ui components for consistent design:

- **Cards**: Information display
- **Tables**: Data presentation
- **Forms**: User input
- **Dialogs**: Modal interactions
- **Alerts**: User notifications
- **Badges**: Status indicators

## 🔒 Security

- JWT token authentication
- Protected routes
- Role-based access control
- Secure API communication

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## 🚀 Deployment

### Build for Production

```bash
npm run build
# or
bun run build
```

### Environment Variables

Set the following environment variables for production:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

**Note**: This application is now ready for backend integration. All dummy data has been removed and replaced with proper API service calls. The frontend will gracefully handle API errors and loading states while waiting for the backend to be implemented. 