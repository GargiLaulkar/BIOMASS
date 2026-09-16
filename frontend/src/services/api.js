const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('bioplan_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('bioplan_token', token);
    } else {
      localStorage.removeItem('bioplan_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('bioplan_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // If unauthorized, could clear token if needed
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.setToken(null);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = data.detail || (typeof data === 'string' ? data : 'API request failed');
        throw new Error(errorMsg);
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async register(name, email, password, role) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
  }

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('bioplan_user');
  }

  // --- Crops Endpoints ---
  async getCrops() {
    return this.request('/api/crops');
  }

  // --- Farms Endpoints ---
  async getFarms() {
    return this.request('/api/farms');
  }

  async getFarmById(id) {
    return this.request(`/api/farms/${id}`);
  }

  async createFarm(farmData) {
    return this.request('/api/farms', {
      method: 'POST',
      body: JSON.stringify(farmData)
    });
  }

  // --- Predictions Endpoints ---
  async predictBiomass(predictionData) {
    return this.request('/api/predictions/biomass', {
      method: 'POST',
      body: JSON.stringify(predictionData)
    });
  }

  async getFarmPrediction(farmId) {
    return this.request(`/api/predictions/${farmId}`);
  }

  // --- Matching Engine Endpoints ---
  async getFarmMatches(farmId) {
    return this.request(`/api/matching/${farmId}`);
  }

  // --- Buyers & Demands Endpoints ---
  async getMyBuyerProfile() {
    return this.request('/api/buyers/me');
  }

  async createBuyerProfile(profileData) {
    return this.request('/api/buyers', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  }

  async updateBuyerProfile(id, profileData) {
    return this.request(`/api/buyers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getAllBuyers() {
    return this.request('/api/buyers');
  }

  async getBuyerById(id) {
    return this.request(`/api/buyers/${id}`);
  }

  async createDemand(demandData) {
    return this.request('/api/demand', {
      method: 'POST',
      body: JSON.stringify(demandData)
    });
  }

  async getMyDemands() {
    return this.request('/api/demand/me');
  }

  async getAllDemands(filters = {}) {
    const params = new URLSearchParams();
    if (filters.biomass_type) params.append('biomass_type', filters.biomass_type);
    if (filters.min_qty) params.append('min_qty', filters.min_qty);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/demand${queryString}`);
  }

  // --- GIS Endpoints ---
  async getNearbyBuyers(farmId, radiusKm = 50.0) {
    return this.request(`/api/gis/nearby-buyers?farm_id=${farmId}&radius_km=${radiusKm}`);
  }

  async getNearbyFarms(buyerId, radiusKm = 50.0) {
    return this.request(`/api/gis/nearby-farms?buyer_id=${buyerId}&radius_km=${radiusKm}`);
  }
}

export const api = new ApiService();
