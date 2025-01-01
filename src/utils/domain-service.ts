import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://120.78.228.69:4601',
  timeout: 10000, // 请求超时时间
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 对返回的数据进行处理
    return response.data;
  },
  (error) => {
    // TODO: 对错误进行处理
    return Promise.reject(error);
  }
);

export default instance;