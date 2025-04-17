import React, { useState, useEffect } from 'react';
import { checkServerStatus, checkDatabaseStatus } from '../services/api';
import './ServerStatus.css';

interface ServerStatusProps {
  showDetails?: boolean;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ showDetails = false }) => {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        // Check server status
        const serverStatus = await checkServerStatus();
        setServerOnline(serverStatus.online);
        
        if (serverStatus.online) {
          // If server is online, check database
          const dbStatus = await checkDatabaseStatus();
          setDbConnected(dbStatus.dbConnected);
        } else {
          setError(serverStatus.error || '服务器离线');
          setDbConnected(false);
        }
      } catch (err) {
        setServerOnline(false);
        setDbConnected(false);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    // Check status immediately
    checkStatus();
    
    // Then check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="server-status loading">检查服务器状态中...</div>;
  }

  if (!serverOnline) {
    return (
      <div className="server-status offline">
        <span className="status-indicator offline"></span>
        服务器离线
        {error && showDetails && <div className="error-details">{error}</div>}
      </div>
    );
  }

  return (
    <div className="server-status">
      <span className="status-indicator online"></span>
      服务器在线
      {showDetails && (
        <div className="status-details">
          <div className="database-status">
            数据库: {dbConnected ? '已连接' : '未连接'}
            <span className={`status-indicator ${dbConnected ? 'online' : 'offline'}`}></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerStatus; 