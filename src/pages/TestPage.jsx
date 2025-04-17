import React, { useState } from 'react';
import { Button, Card, Typography, Space, Alert } from 'antd';
import { API_BASE_URL, ENDPOINTS } from '../services/api';

const { Title, Text, Paragraph } = Typography;

function TestPage() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testDailyComplete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing Daily Complete Endpoint');
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('ENDPOINTS.DAILY_GAME_COMPLETE:', ENDPOINTS.DAILY_GAME_COMPLETE);
      
      // Build headers
      const headers = {};
      const token = localStorage.getItem('auth_token');
      const sessionId = localStorage.getItem('anonymous_user_id');
      
      console.log('Token available:', !!token);
      console.log('Session ID available:', !!sessionId);
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      if (sessionId) {
        headers['X-Session-ID'] = sessionId;
        console.log('Using session ID:', sessionId);
      }
      
      const url = `${API_BASE_URL}${ENDPOINTS.DAILY_GAME_COMPLETE}`;
      console.log('Requesting URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        let errorMsg = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Use default error
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      setResponse(data);
    } catch (err) {
      console.error('Test failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>API Test Page</Title>
      
      <Card title="Test Daily Complete Endpoint">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            API Base URL: <Text code>{API_BASE_URL}</Text>
          </Paragraph>
          <Paragraph>
            Endpoint: <Text code>{ENDPOINTS.DAILY_GAME_COMPLETE}</Text>
          </Paragraph>
          <Paragraph>
            Full URL: <Text code>{API_BASE_URL}{ENDPOINTS.DAILY_GAME_COMPLETE}</Text>
          </Paragraph>
          
          <Button
            type="primary"
            onClick={testDailyComplete}
            loading={loading}
          >
            Test api/game/daily/complete
          </Button>
          
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
            />
          )}
          
          {response && (
            <div>
              <Title level={4}>Response:</Title>
              <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}

export default TestPage; 