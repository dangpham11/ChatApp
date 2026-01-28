import axios from 'axios';

export const API_BASE_URL = 'http://localhost:5000/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  auth: {
    register: `${API_BASE_URL}/Auth/register`,
    login: `${API_BASE_URL}/Auth/login`,
    me: `${API_BASE_URL}/Auth/me`,
    updateProfile: `${API_BASE_URL}/Auth/update-profile`,
    changePassword: `${API_BASE_URL}/Auth/change-password`,
    logout: `${API_BASE_URL}/Auth/logout`,
  },
  files: {
    upload: `${API_BASE_URL}/Files/upload`,
    delete: (publicId: string) => `${API_BASE_URL}/Files/delete/${publicId}`,
  },
  conversations: {
    myConversations: `${API_BASE_URL}/Conversations/my-conversations`,
    create: `${API_BASE_URL}/Conversations/create`,
    addParticipants: (conversationId: number) => `${API_BASE_URL}/Conversations/${conversationId}/add-participants`,
    leave: (conversationId: number) => `${API_BASE_URL}/Conversations/${conversationId}/leave`,
    details: (conversationId: number) => `${API_BASE_URL}/Conversations/${conversationId}/details`,
  },
  messages: {
    getMessages: (conversationId: number, page = 1, pageSize = 50) =>
      `${API_BASE_URL}/Messages/conversation/${conversationId}?page=${page}&pageSize=${pageSize}`,
    send: `${API_BASE_URL}/Messages/send`,
    edit: (messageId: number) => `${API_BASE_URL}/Messages/${messageId}/edit`,
    recall: (messageId: number) => `${API_BASE_URL}/Messages/${messageId}/recall`,
    react: (messageId: number) => `${API_BASE_URL}/Messages/${messageId}/react`,
    forward: `${API_BASE_URL}/Messages/forward`,
    pin: (messageId: number) => `${API_BASE_URL}/Messages/${messageId}/pin`,
    getPinned: (conversationId: number) => `${API_BASE_URL}/Messages/conversation/${conversationId}/pinned`,
  },
  readReceipts: {
    markRead: (messageId: number) => `${API_BASE_URL}/MessageReadReceipts/${messageId}/mark-read`,
    getReceipts: (messageId: number) => `${API_BASE_URL}/MessageReadReceipts/${messageId}/receipts`,
  },
  reactions: {
    add: `${API_BASE_URL}/Reactions/add`,
    remove: (reactionId: number) => `${API_BASE_URL}/Reactions/${reactionId}`,
  },
  users: {
    search: (query: string) => `${API_BASE_URL}/Users/search?query=${encodeURIComponent(query)}`,
    byEmail: (email: string) => `${API_BASE_URL}/Users/by-email?email=${encodeURIComponent(email)}`,
  },
};
