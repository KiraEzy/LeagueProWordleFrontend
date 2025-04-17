import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarOutlined, TrophyOutlined, UserOutlined, FireOutlined } from '@ant-design/icons';
import './PlayPage.css';

function PlayPage() {
  return (
    <div className="play-page">
      <h1>英雄联盟职业选手猜词</h1>
      <div className="game-container">
        <div className="game-modes">
          <h2>游戏模式</h2>
          <div className="mode-cards">
            <Link to="/single-player" className="mode-card">
              <div className="mode-icon">
                <UserOutlined />
              </div>
              <h3>练习模式</h3>
              <p>无限次练习，提高您的猜词技巧。没有每日限制！</p>
              <div className="mode-button">
                开始练习
              </div>
            </Link>
            
            <Link to="/record-mode" className="mode-card">
              <div className="mode-icon">
                <FireOutlined />
              </div>
              <h3>记录模式</h3>
              <p>尝试用最少的次数猜出选手，创造您的个人最佳记录！</p>
              <div className="mode-button">
                挑战记录 <TrophyOutlined />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayPage; 