import React from 'react';
import './LeaderboardPage.css';

function LeaderboardPage() {
  // Mock data for the leaderboard
  const topPlayers = [
    { id: 1, username: "Faker_Fan", wins: 42, avgGuesses: 3.2 },
    { id: 2, username: "TheShy_Pro", wins: 38, avgGuesses: 3.4 },
    { id: 3, username: "Chovy_Enjoyer", wins: 35, avgGuesses: 3.7 },
    { id: 4, username: "Caps_Admirer", wins: 32, avgGuesses: 3.9 },
    { id: 5, username: "Ruler_Stan", wins: 29, avgGuesses: 4.1 },
    { id: 6, username: "Deft_Believer", wins: 27, avgGuesses: 4.2 },
    { id: 7, username: "UziSupremacy", wins: 25, avgGuesses: 4.3 },
    { id: 8, username: "ShowmakerFan", wins: 22, avgGuesses: 4.5 },
    { id: 9, username: "Knight_Enthusiast", wins: 20, avgGuesses: 4.6 },
    { id: 10, username: "Canyon_Lover", wins: 18, avgGuesses: 4.8 }
  ];

  return (
    <div className="leaderboard-page">
      <h1>Leaderboard</h1>
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <div className="rank">Rank</div>
          <div className="player">Player</div>
          <div className="wins">Wins</div>
          <div className="avg-guesses">Avg. Guesses</div>
        </div>
        <div className="leaderboard-rows">
          {topPlayers.map((player, index) => (
            <div key={player.id} className="leaderboard-row">
              <div className="rank">{index + 1}</div>
              <div className="player">{player.username}</div>
              <div className="wins">{player.wins}</div>
              <div className="avg-guesses">{player.avgGuesses}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LeaderboardPage; 