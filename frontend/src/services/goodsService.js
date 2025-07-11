import { authenticatedFetch, getAuthHeaders, getAuthHeadersForFile } from '../utils/authUtils';

const API_BASE_URL = 'http://localhost:8000';

class GoodsService {
  async getAuthHeaders() {
    return getAuthHeaders();
  }

  async getAuthHeadersForFile() {
    return getAuthHeadersForFile();
  }

  // Helper method for authenticated requests
  async authenticatedFetch(url, options = {}) {
    return authenticatedFetch(url, options);
  }

  // China Warehouse Methods
  async getChinaGoods(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/goods/china/${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.authenticatedFetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch China goods: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createChinaGoods(goodsData) {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/china/`, {
      method: 'POST',
      body: JSON.stringify(goodsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create China goods: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateChinaGoods(id, goodsData) {
    const response = await fetch(`${API_BASE_URL}/api/goods/china/${id}/`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(goodsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update China goods: ${response.statusText}`);
    }
    
    return response.json();
  }

  async deleteChinaGoods(id) {
    const response = await fetch(`${API_BASE_URL}/api/goods/china/${id}/`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete China goods: ${response.statusText}`);
    }
  }

  async updateChinaGoodsStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/api/goods/china/${id}/update_status/`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update status: ${response.statusText}`);
    }
    
    return response.json();
  }

  async bulkUpdateChinaStatus(ids, status) {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/china/bulk_status_update/`, {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to bulk update status: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getChinaStatistics() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/china/statistics/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch China statistics: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getChinaFlaggedItems() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/china/flagged_items/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flagged items: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getChinaReadyForShipping() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/china/ready_for_shipping/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ready for shipping items: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getChinaOverdueItems(days = 30) {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/china/overdue_items/?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch overdue items: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Ghana Warehouse Methods
  async getGhanaGoods(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/goods/ghana/${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Ghana goods: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createGhanaGoods(goodsData) {
    console.log('Sending Ghana goods data:', goodsData); // Debug log
    
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/ghana/`, {
      method: 'POST',
      body: JSON.stringify(goodsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Ghana goods creation error:', errorData); // Debug log
      throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData) || `Failed to create Ghana goods: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateGhanaGoods(id, goodsData) {
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/${id}/`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(goodsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update Ghana goods: ${response.statusText}`);
    }
    
    return response.json();
  }

  async deleteGhanaGoods(id) {
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/${id}/`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete Ghana goods: ${response.statusText}`);
    }
  }

  async updateGhanaGoodsStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/${id}/update_status/`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update status: ${response.statusText}`);
    }
    
    return response.json();
  }

  async bulkUpdateGhanaStatus(ids, status) {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/ghana/bulk_status_update/`, {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to bulk update status: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getGhanaStatistics() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/ghana/statistics/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Ghana statistics: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getGhanaFlaggedItems() {
    const response = await this.authenticatedFetch(`${API_BASE_URL}/api/goods/ghana/flagged_items/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flagged items: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getGhanaReadyForShipping() {
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/ready_for_shipping/`, {
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ready for shipping items: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getGhanaOverdueItems(days = 30) {
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/overdue_items/?days=${days}`, {
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch overdue items: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Excel Upload/Download Methods
  async uploadChinaExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('warehouse', 'china');
    
    const response = await fetch(`${API_BASE_URL}/api/goods/china/upload_excel/`, {
      method: 'POST',
      headers: await this.getAuthHeadersForFile(),
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to upload Excel file: ${response.statusText}`);
    }
    
    return response.json();
  }

  async uploadGhanaExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('warehouse', 'ghana');
    
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/upload_excel/`, {
      method: 'POST',
      headers: await this.getAuthHeadersForFile(),
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to upload Excel file: ${response.statusText}`);
    }
    
    return response.json();
  }

  async downloadChinaTemplate() {
    const response = await fetch(`${API_BASE_URL}/api/goods/china/download_template/`, {
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }
    
    return response.blob();
  }

  async downloadGhanaTemplate() {
    const response = await fetch(`${API_BASE_URL}/api/goods/ghana/download_template/`, {
      headers: await this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Helper method to download file
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export default new GoodsService();
