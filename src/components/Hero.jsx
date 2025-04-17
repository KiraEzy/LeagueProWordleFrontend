import React from 'react';
import { Button, Dropdown } from 'antd';
import { DownOutlined, UserOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './Hero.css';

function Hero() {
  const navigate = useNavigate();
  
  const singlePlayerItems = [
    {
      key: 'practice',
      label: '练习模式',
      icon: <UserOutlined />,
      onClick: () => navigate('/single-player'),
    },
    {
      key: 'daily',
      label: '每日挑战',
      icon: <CalendarOutlined />,
      onClick: () => navigate('/daily'),
    },
    {
      key: 'record',
      label: '记录模式',
      icon: <TrophyOutlined />,
      onClick: () => navigate('/record-mode'),
    }
  ];

  return (
    <section className="hero">
      <div className="hero-content">
        <h1>英雄联盟猜词</h1>
        <p className="hero-subtitle">
          考验您对参加过世界赛的英雄联盟职业选手的认知
        </p>
        <div className="hero-actions">
          <Dropdown menu={{ items: singlePlayerItems }} placement="bottom">
            <Button 
              type="primary" 
              size="large" 
              icon={<UserOutlined />}
              className="single-player-btn"
            >
              开始游戏 <DownOutlined />
            </Button>
          </Dropdown>
        </div>
      </div>
    </section>
  );
}

export default Hero; 