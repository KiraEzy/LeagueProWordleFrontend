import React from 'react';
import { Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { initiateGoogleLogin } from '../services/api';
import './GoogleLogin.css';

// Get base URL from environment or default
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Use API URL as is with /api suffix if needed
const API_BASE_URL = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;

// Extract the base server URL (without /api)
const SERVER_URL = API_BASE_URL.replace(/\/api$/, '');

interface GoogleLoginProps {
  className?: string;
  buttonText?: string;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ 
  className = '',
  buttonText = '使用谷歌账号登录' 
}) => {
  const handleGoogleLogin = () => {
    initiateGoogleLogin();
  };

  return (
    <Button
      type="default"
      icon={<GoogleOutlined />}
      onClick={handleGoogleLogin}
      className={`google-login-button ${className}`}
    >
      {buttonText}
    </Button>
  );
};

export default GoogleLogin; 