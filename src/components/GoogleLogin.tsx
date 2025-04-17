import React from 'react';
import { Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { initiateGoogleLogin } from '../services/api';
import './GoogleLogin.css';

// Base API URL - from environment variable or fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.239:5432/api';

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