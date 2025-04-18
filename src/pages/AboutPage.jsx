import React from 'react';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      <h1>关于英雄联盟猜选手</h1>
      
      <div className="about-section">
        <h2>如何游玩</h2>
        <p>
          每局游戏都会有一个神秘的英雄联盟职业选手需要您来猜测。您有6次尝试机会来找出这位选手是谁。
          每次猜测后，您都会收到关于您的猜测与正确答案相似程度的提示。
        </p>
        <p>
          提示包括以下选手信息：
        </p>
        <ul>
          <li>当前所在队伍（或最后效力的队伍）</li>
          <li>赛区/联赛（LCK、LPL、LEC、LCS等）</li>
          <li>位置（上单、打野、中单、ADC、辅助）</li>
          <li>地区</li>
          <li>世界赛出场次数</li>
        </ul>
      </div>
      
      <div className="about-section">
        <h2>联系我们</h2>
        <p>
          有反馈、建议或发现了bug？请通过 <a href="mailto:contact@leagueprowordle.com">contact@leagueprowordle.com</a> 
          联系我们。
        </p>
      </div>
    </div>
  );
}

export default AboutPage; 