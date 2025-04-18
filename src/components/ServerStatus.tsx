import React, { useState, useEffect } from 'react';
import { checkServerStatus, checkDatabaseStatus } from '../services/api';
import './ServerStatus.css';

interface ServerStatusProps {
  showDetails?: boolean;
}

// Define an offline mode constant
const OFFLINE_MODE = true;

const ServerStatus: React.FC<ServerStatusProps> = ({ showDetails = false }) => {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        
        if (OFFLINE_MODE) {
          // In offline mode, show a specific message
          setServerOnline(false);
          setDbConnected(false);
          setError('离线模式 - 使用本地数据');
          setLoading(false);
          return;
        }
        
        // Check server status
        const serverStatus = await checkServerStatus();
        setServerOnline(serverStatus);
        
        if (serverStatus) {
          // If server is online, check database
          const dbStatus = await checkDatabaseStatus();
          setDbConnected(dbStatus.dbConnected);
        } else {
          setError('服务器离线');
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
    
    // Then check every 30 seconds if not in offline mode
    let interval: number | null = null;
    if (!OFFLINE_MODE) {
      interval = window.setInterval(checkStatus, 30000);
    }
    
    // Cleanup
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, []);

  if (loading) {
    return <div className="server-status loading">检查服务器状态中...</div>;
  }

  if (OFFLINE_MODE) {
    return (
      <div className="server-status offline-mode">
        <span className="status-indicator offline-mode"></span>
        离线模式 - 使用本地数据
        {showDetails && <div className="status-details">使用本地 JSON 数据文件</div>}
      </div>
    );
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