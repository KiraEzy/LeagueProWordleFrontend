import React from 'react';
import Hero from './Hero';
import HowToPlay from './HowToPlay';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <Hero />
      <HowToPlay />
    </div>
  );
}

export default HomePage; 