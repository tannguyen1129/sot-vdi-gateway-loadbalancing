import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://sotvdi.umtoj.edu.vn/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- [BẮT BUỘC PHẢI CÓ ĐOẠN NÀY] ---
// Nếu thiếu đoạn này, mọi request nộp bài sẽ bị 401
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// ------------------------------------

export default api;