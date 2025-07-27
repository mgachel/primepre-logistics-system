const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const dashBoardService = {
    // Fetch cargo dashboard stats (goods received, in transit, etc.)
    getCargoDashboard: async (cargoType = 'sea', token) => {
        const response = await fetch(`${API_URL}/api/cargo/api/dashboard/?cargo_type=${cargoType}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch cargo dashboard');
        return response.json();
    },

    // Fetch client summaries (for client distribution)
    getClientSummaries: async (token) => {
        const response = await fetch(`${API_URL}/api/cargo/api/client-summaries/`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch client summaries');
        return response.json();
    },

    // Fetch user statistics (for total clients, new, inactive, etc.)
    getUserStatistics: async (token) => {
        const response = await fetch(`${API_URL}/api/auth/admin/users/statistics/`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch user statistics');
        return response.json();
    },
}; 