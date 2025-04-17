import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Modal, message, Divider } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { registerUser, handleGoogleLoginCallback } from '../services/api';
import { saveAuthData, isAuthenticated, getUsername, logout } from '../services/sessionService';
import GoogleLogin from './GoogleLogin';
import './UserRegistration.css';

interface RegistrationProps {
  onRegister?: () => void;
}

export const UserRegistrationModal: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onRegister?: () => void;
}> = ({ visible, onCancel, onRegister }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { username: string; email?: string }) => {
    setLoading(true);
    try {
      const result = await registerUser(values.username, values.email);
      // Save authentication data
      saveAuthData(result.token, result.username);
      message.success('注册成功！');
      form.resetFields();
      onCancel();
      if (onRegister) onRegister();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('注册失败，请重试。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="创建账号"
      open={visible}
      onCancel={onCancel}
      footer={null}
      className="registration-modal"
    >
      <p className="registration-subtitle">
        创建账号以保存您的进度和统计数据！
      </p>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少需要3个字符' },
            { max: 20, message: '用户名不能超过20个字符' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: '用户名只能包含字母、数字和下划线',
            },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="选择一个用户名" />
        </Form.Item>
        <Form.Item
          name="email"
          label="邮箱（可选）"
          rules={[
            {
              type: 'email',
              message: '请输入有效的电子邮箱地址',
            },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="输入您的邮箱（可选）" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="register-button"
            loading={loading}
            block
          >
            创建账号
          </Button>
        </Form.Item>
      </Form>
      
      <Divider>
        <span className="divider-text">或</span>
      </Divider>
      
      <GoogleLogin buttonText="使用谷歌账号登录" />
    </Modal>
  );
};

const UserRegistration: React.FC<RegistrationProps> = ({ onRegister }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [username, setUsername] = useState(getUsername());
  
  // Check for authentication success redirect from Google
  useEffect(() => {
    // Check if this is a redirect from Google authentication
    const { token, username, error } = handleGoogleLoginCallback();
    
    if (token && username && window.location.pathname === '/login/success') {
      // Save the authentication data
      saveAuthData(token, username);
      // Update state
      setAuthenticated(true);
      setUsername(username);
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
      message.success(`欢迎，${username}！`);
      
      // Call onRegister callback if provided
      if (onRegister) onRegister();
    }
    
    // Check for auth errors
    if (error && window.location.pathname === '/login') {
      message.error(error === 'auth_failed' 
        ? '认证失败，请重试。' 
        : '登录过程中发生错误，请重试。');
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    }
  }, [onRegister]);

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUsername(null);
    message.success('您已成功登出');
  };

  if (authenticated) {
    return (
      <div className="user-profile">
        <span className="welcome-message">欢迎，{username}！</span>
        <Button onClick={handleLogout} size="small">
          登出
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="primary"
        onClick={() => setModalVisible(true)}
        className="register-button"
      >
        创建账号
      </Button>
      <UserRegistrationModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onRegister={() => {
          setAuthenticated(true);
          setUsername(getUsername());
          if (onRegister) onRegister();
        }}
      />
    </>
  );
};

export default UserRegistration; 