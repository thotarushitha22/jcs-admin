import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

// Fetch all regular users
export const fetchAllUsers = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Fetch all merchants
export const fetchAllMerchants = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/admin/merchants`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Delete a user
export const deleteUser = async (id, token) => {
  const response = await axios.delete(`${API_BASE_URL}/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Delete a merchant
export const deleteMerchant = async (id, token) => {
  const response = await axios.delete(`${API_BASE_URL}/admin/merchants/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Fetch all admin orders
export const fetchAdminOrders = async (token) => {
  const response = await axios.get(`${API_BASE_URL}/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};