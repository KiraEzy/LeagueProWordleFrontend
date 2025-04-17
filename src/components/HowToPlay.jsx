import React from 'react';
import './HowToPlay.css';

function HowToPlay() {
  const steps = [
    {
      id: 1,
      title: "选择游戏模式",
      description: "选择每日挑战、练习模式或记录模式开始游戏。"
    },
    {
      id: 2,
      title: "猜测职业选手",
      description: "尝试在6次尝试内猜出神秘的英雄联盟职业选手。"
    },
    {
      id: 3,
      title: "利用提示信息",
      description: "每次猜测后，您将获得关于选手的战队、位置、地区等提示。"
    },
    {
      id: 4,
      title: "提高技巧",
      description: "不断练习提高您的猜测技巧，打破个人最佳记录。"
    }
  ];

  return (
    <section className="how-to-play">
      <h2>游戏指南</h2>
      <div className="steps-container">
        {steps.map((step) => (
          <div key={step.id} className="step-card">
            <div className="step-number">{step.id}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowToPlay; 