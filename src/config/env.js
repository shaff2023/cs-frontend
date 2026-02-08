// Environment configuration
const getApiUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

const getSocketUrl = () => {
  return process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

const getBaseUrl = () => {
  return process.env.REACT_APP_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

export { getApiUrl, getSocketUrl, getBaseUrl };
