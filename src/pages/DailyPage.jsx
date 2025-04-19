import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Typography, AutoComplete, Tooltip, Tag } from 'antd';
import { QuestionCircleOutlined, BugOutlined, TrophyOutlined, UndoOutlined } from '@ant-design/icons';
import './SinglePlayerPage.css'; // Reuse the same CSS
import { Link } from 'react-router-dom';
import AppearanceSettings from '../components/AppearanceSettings';

const { Title, Text, Paragraph } = Typography;

// Import the player data service instead of the JSON file
import { fetchAndFormatPlayers } from '../services/playerDataService';
// Import API functions for daily game
import { getDailyChallenge, submitGuess, getAllPlayers, getDebugDailyAnswer } from '../services/api';
// Import session service for anonymous ID
import { getOrCreateAnonymousId } from '../services/sessionService';

// Set to true for development, false for production
const DEBUG_MODE = process.env.NODE_ENV === 'development';

function DailyPage() {
  const [loading, setLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [dailyGameInfo, setDailyGameInfo] = useState(null);
  const [gameStatus, setGameStatus] = useState('loading'); // 'loading', 'playing', 'won', 'lost'
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    winPercentage: 0
  });
  const [playerOptions, setPlayerOptions] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [formattedPlayers, setFormattedPlayers] = useState({});
  const [nameToMainNameMap, setNameToMainNameMap] = useState({});
  const [apiError, setApiError] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [debugAnswer, setDebugAnswer] = useState(null);
  const [remainingGuesses, setRemainingGuesses] = useState(6);
  const [lastPlayedDate, setLastPlayedDate] = useState(null);

  const MAX_GUESSES = 6;

  // Format player data for consistent display and logic
  const formatPlayerData = (playerData) => {
    const formatted = {};
    const nameMap = {};
    
    Object.entries(playerData).forEach(([key, player]) => {
      // Format team display
      let formattedTeam = "退役";
      
      // Handle isRetired which could be a string "0"/"1" from JSON or boolean from API
      const isRetired = 
        typeof player.isRetired === 'string' 
          ? player.isRetired === "1" 
          : Boolean(player.isRetired);
      
      // Handle player current role field naming differences (player_current_role vs current_role)
      const currentRole = (player.current_role || player.player_current_role || '').toLowerCase();
      
      // Check if current role is one of the valid playing positions with case-insensitive comparison
      const isActiveRole = ['top', 'jungle', 'mid', 'bot', 'adc', 'support'].includes(currentRole);
      
      // If player is retired or has no team or doesn't have an active playing role
      if (isRetired || !player.current_team || !isActiveRole) {
        formattedTeam = "退役";
      } else {
        // Otherwise use their current team
        formattedTeam = player.current_team || player.team || "未知";
      }
      
      formatted[key] = {
        ...player,
        formattedTeam
      };
      
      // Map all alternate names to the main name
      if (player.allNames && Array.isArray(player.allNames)) {
        player.allNames.forEach(alternateName => {
          nameMap[alternateName.toLowerCase()] = key;
        });
      }
      
      // Also map the main name to itself
      nameMap[key.toLowerCase()] = key;
    });
    
    return { formatted, nameMap };
  };

  // Load game state and player data on component mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Get complete daily game data from the backend - includes all previous guesses and stats
        const completeData = await getDailyChallenge();
        
        // Log the complete data structure for debugging
        console.log('Received daily game data:', completeData);
        
        // Set game information
        setDailyGameInfo(completeData.gameInfo);
        
        // Set game status and already played flag
        setGameStatus(completeData.gameStatus);
        setAlreadyPlayed(completeData.alreadyPlayed);
        
        // Set user stats
        setGameStats({
          gamesPlayed: completeData.stats.gamesPlayed,
          gamesWon: completeData.stats.gamesWon,
          currentStreak: completeData.stats.currentStreak,
          maxStreak: completeData.stats.maxStreak,
          winPercentage: completeData.stats.winPercentage
        });
        
        // Log the guesses structure for debugging
        if (completeData.guesses && completeData.guesses.length > 0) {
          console.log('First guess structure sample:', completeData.guesses[0]);
        }
        
        // Set previous guesses
        setGuesses(completeData.guesses);
        
        // Set remaining guesses
        setRemainingGuesses(completeData.remainingGuesses);

        // Fetch players from API and format them
        const playerData = await fetchAndFormatPlayers();
        
        // Create formatted player data with consistent team display
        const { formatted, nameMap } = formatPlayerData(playerData);
        setFormattedPlayers(formatted);
        setNameToMainNameMap(nameMap);
        
        // Convert player data to usable format and create options for autocomplete
        const playerEntries = Object.entries(formatted);
        
        // Create options for each player (one entry per player, searchable by all names)
        const options = playerEntries.map(([key, player]) => {
          // Build search terms from all names
          const searchTerms = [...(player.allNames || []), key];
          
          return {
            value: key,
            label: `${key} (${player.formattedTeam} - ${player.tournament_role || '未知'})`,
            searchTerms: searchTerms.map(name => name.toLowerCase()),
            mainName: key,
          };
        });
        
        setPlayerOptions(options);
        setAllPlayers(formatted);
        
        // The actual target player is not known to the frontend in regular mode
        // We will only know if guesses are correct or not from the backend
        setTargetPlayer({ name: "未知", worldAppearances: 0 });
        
        // If in debug mode, try to get the target player information
        if (DEBUG_MODE) {
          try {
            // A helper function to find target player by testing a known guess
            await fetchDebugTargetPlayer(playerEntries, formatted);
          } catch (debugError) {
            console.error("Debug mode: Error fetching target player:", debugError);
          }
        }
        
        setApiError(false);
        
        if (DEBUG_MODE) {
          console.log("Loaded player data with", playerEntries.length, "players");
          console.log("Daily game complete data:", completeData);
        }
      } catch (error) {
        console.error("Error loading game data:", error);
        message.error("无法从服务器加载游戏数据。请检查您的网络连接并重试。");
        setApiError(true);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Debug function to identify the target player by testing guesses
  const fetchDebugTargetPlayer = async (playerEntries, formatted) => {
    try {
      // Call the debug endpoint to get today's answer directly
      const debugData = await getDebugDailyAnswer();
      
      if (debugData && debugData.player) {
        // Format the answer data for consistent display
        const player = debugData.player;
        setDebugAnswer({
          name: player.name,
          formattedTeam: player.current_team || '退役',
          role: player.tournament_role || '未知',
          nationality: player.nationality || '未知',
          appearances: player.appearance || 0
        });
      }
    } catch (error) {
      console.error("Error getting debug target player:", error);
    }
  };

  // Handler for submitting a guess
  const handleSubmitGuess = async () => {
    // Do not allow guesses if the game is not in playing state
    if (gameStatus !== 'playing' || alreadyPlayed) {
      return;
    }

    const guessedPlayerName = currentGuess.trim();
    if (!guessedPlayerName) {
      message.warning("请输入选手名称");
      return;
    }

    try {
      setLoading(true);

      // Find player by exact name or alternate name
      const normalizedGuess = guessedPlayerName.toLowerCase();
      const mainName = nameToMainNameMap[normalizedGuess];
      
      if (!mainName) {
        message.warning("未找到该选手，请输入一个有效的选手名称");
        setLoading(false);
        return;
      }

      const guessedPlayer = formattedPlayers[mainName];
      
      // Submit the guess to the API
      const feedback = await submitGuess(guessedPlayer.id);
      
      // Update guesses list with the new guess and its feedback
      const newGuess = {
        name: mainName,
        playerName: mainName,
        ...feedback
      };
      
      const updatedGuesses = [...guesses, newGuess];
      setGuesses(updatedGuesses);

      // Reset current guess
      setCurrentGuess('');
      
      // Update remaining guesses
      setRemainingGuesses(MAX_GUESSES - updatedGuesses.length);
      
      // Check if game is over (won or last guess used)
      if (feedback.correct) {
        setGameStatus('won');
        message.success("恭喜！您猜对了！");
        // Update local storage to record that today's game is completed
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('leagueProWordleLastPlayedDaily', today);
      } else if (updatedGuesses.length >= MAX_GUESSES) {
        setGameStatus('lost');
        message.error("游戏结束！您已用完所有 {MAX_GUESSES} 次猜测机会。");
        // Update local storage to record that today's game is completed
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('leagueProWordleLastPlayedDaily', today);
      }

      // Update game stats if needed
      if (feedback.correct || updatedGuesses.length >= MAX_GUESSES) {
        try {
          const completeData = await getDailyChallenge();
          setGameStats({
            gamesPlayed: completeData.stats.gamesPlayed,
            gamesWon: completeData.stats.gamesWon,
            currentStreak: completeData.stats.currentStreak,
            maxStreak: completeData.stats.maxStreak,
            winPercentage: completeData.stats.winPercentage
          });
        } catch (statError) {
          console.error("Error updating game stats:", statError);
        }
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      message.error("提交猜测时出错，请重试");
    } finally {
      setLoading(false);
    }
  };

  // render property hint using emoji and text
  const renderHint = (property, hints) => {
    if (hints[property] === 'correct') {
      return <span className="hint-text correct">✓</span>;
    } else if (hints[property] === 'close') {
      return <span className="hint-text close">◯</span>;
    } else {
      return <span className="hint-text wrong">✗</span>;
    }
  };

  // Handle changes to the autocomplete field
  const handleAutoCompleteChange = (value) => {
    setCurrentGuess(value);
  };

  // Optional handler to select from dropdown
  const handleSelect = (value, option) => {
    setCurrentGuess(value);
  };

  // Filter options for autocomplete
  const filterOption = (inputValue, option) => {
    return option.searchTerms.some(term => 
      term.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
    );
  };

  // Format options for display
  const getOptionLabel = (option) => {
    return {
      value: option.value,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{option.value}</span>
          <span style={{ color: '#888' }}>{`${option.formattedTeam || ''} ${option.role || ''}`}</span>
        </div>
      ),
    };
  };

  // Render guess rows in the game grid
  const renderGuessRows = () => {
    const rows = [];
    
    // Add rows for guesses already made
    for (let i = 0; i < guesses.length; i++) {
      const guess = guesses[i];
      rows.push(
        <div key={`guess-${i}`} className="guess-row">
          <div className="player-name">{guess.name}</div>
          <div className={`property ${guess.hints.team}`}>
            <span className="property-value">{guess.team?.value || '未知'}</span>
            {renderHint('team', guess.hints)}
          </div>
          <div className={`property ${guess.hints.age || 'unknown'}`}>
            <span className="property-value">{guess.age?.value || '?'}</span>
            {renderHint('age', guess.hints)}
          </div>
          <div className={`property ${guess.hints.role}`}>
            <span className="property-value">{guess.role?.value || '未知'}</span>
            {renderHint('role', guess.hints)}
          </div>
          <div className={`property ${guess.hints.nationality}`}>
            <span className="property-value">{guess.nationality?.value || '未知'}</span>
            {renderHint('nationality', guess.hints)}
          </div>
          <div className={`property ${guess.hints.worldAppearances}`}>
            <span className="property-value">{guess.appearances?.value || 0}</span>
            {renderHint('worldAppearances', guess.hints)}
          </div>
        </div>
      );
    }
    
    // Add empty rows for remaining guesses
    for (let i = guesses.length; i < MAX_GUESSES; i++) {
      rows.push(
        <div key={`empty-${i}`} className="guess-row empty">
          <div className="player-name">???</div>
          <div className="property">
            <span className="property-value">?</span>
          </div>
          <div className="property">
            <span className="property-value">?</span>
          </div>
          <div className="property">
            <span className="property-value">?</span>
          </div>
          <div className="property">
            <span className="property-value">?</span>
          </div>
          <div className="property">
            <span className="property-value">?</span>
          </div>
        </div>
      );
    }
    
    return rows;
  };

  // Handle clearing localStorage for debugging
  const handleDebugReset = () => {
    localStorage.removeItem('leagueProWordleDailyGuesses');
    localStorage.removeItem('leagueProWordleLastPlayedDaily');
    window.location.reload();
  };

  // Render the game status and stats
  const renderGameStatus = () => {
    if (gameStatus === 'won') {
      return (
        <div className="game-result winning">
          <TrophyOutlined className="result-icon" />
          <h2>恭喜！您猜对了！</h2>
          <p>您用了 {guesses.length} 次猜测就找到了正确答案。</p>
          <p>明天再来挑战新的每日谜题！</p>
        </div>
      );
    } else if (gameStatus === 'lost') {
      return (
        <div className="game-result losing">
          <h2>游戏结束！</h2>
          <p>您已用完所有 {MAX_GUESSES} 次猜测机会。</p>
          <p>明天再来挑战新的每日谜题！</p>
        </div>
      );
    } else if (alreadyPlayed) {
      return (
        <div className="game-result">
          <h2>您已完成今天的挑战！</h2>
          <p>请明天再来挑战新的每日谜题。</p>
        </div>
      );
    }
    return null;
  };

  // Render the stats display
  const renderStats = () => {
    return (
      <div className="stats-container">
        <h3>统计数据</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{gameStats.gamesPlayed}</div>
            <div className="stat-label">总游戏</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{gameStats.winPercentage}%</div>
            <div className="stat-label">胜率</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{gameStats.currentStreak}</div>
            <div className="stat-label">当前连胜</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{gameStats.maxStreak}</div>
            <div className="stat-label">最大连胜</div>
          </div>
        </div>
      </div>
    );
  };

  // TODO: Render the rules and instructions
  const renderInstructions = () => {
    return (
      <div className="instructions">
        <h3>游戏规则</h3>
        <div className="rules-text">
          <p>尝试猜出今天的职业选手。您有 6 次猜测机会。</p>
          <p>每次猜测后，您将会收到关于您猜测的选手与目标选手相比的提示：</p>
          <ul>
            <li>
              <span className="hint-text correct">✓</span> 表示该属性完全匹配
            </li>
            <li>
              <span className="hint-text close">◯</span> 表示该属性接近但不完全匹配
            </li>
            <li>
              <span className="hint-text wrong">✗</span> 表示该属性完全不匹配
            </li>
          </ul>
          <p>接近匹配规则：</p>
          <ul>
            <li>战队：同一区域的战队被视为"接近"</li>
            <li>位置：相似位置被视为"接近"（例如：中单/下路是相近的进攻位置）</li>
            <li>地区：如果两名选手拥有相同的居住地区但地区不同，则被视为"接近"</li>
            <li>世界赛出场次数：相差 ±2 次被视为"接近"</li>
          </ul>
          <p>每天会有一个新的选手等待您来猜测！</p>
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading && guesses.length === 0) {
    return (
      <div className="game-container loading">
        <Spin size="large" />
        <p>加载中...</p>
      </div>
    );
  }

  // Render error state
  if (apiError) {
    return (
      <div className="game-container error">
        <Title level={2}>出错了</Title>
        <Paragraph>
          加载每日挑战时出错。请检查您的网络连接并刷新页面重试。
        </Paragraph>
        <Button type="primary" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="game-container daily">
      <div className="game-header">
        <Title level={2}>每日挑战</Title>
        <Paragraph>
          每天猜一个新的职业选手！您今天还剩 <strong>{remainingGuesses}</strong> 次猜测机会。
        </Paragraph>
        
        <AppearanceSettings gameMode="daily" />
        
        {/* Always show answer if available */}
        {debugAnswer && (
          <div className="answer-info">
            <Tag color="blue" icon={<QuestionCircleOutlined />}>
              今日答案: {debugAnswer.name} ({debugAnswer.formattedTeam}, 
              {debugAnswer.role}, {debugAnswer.nationality}, 
              世界赛出场次数: {debugAnswer.appearances})
            </Tag>
            <Button onClick={handleDebugReset} icon={<UndoOutlined />}>重置缓存</Button>
          </div>
        )}
        
        {DEBUG_MODE && debugAnswer && (
          <div className="debug-info">
            <h3>调试信息</h3>
            <p>今日答案: {debugAnswer.name}</p>
            <p>战队: {debugAnswer.formattedTeam}</p>
            <p>位置: {debugAnswer.role}</p>
            <p>地区: {debugAnswer.nationality}</p>
            <p>世界赛出场次数: {debugAnswer.appearances}</p>
            <Button onClick={handleDebugReset} icon={<BugOutlined />}>重置调试缓存</Button>
          </div>
        )}
      </div>

      <div className="game-board">
        <div className="game-grid">
          <div className="header-row">
            <div className="header-cell">选手</div>
            <div className="header-cell">战队</div>
            <div className="header-cell">年龄</div>
            <div className="header-cell">位置</div>
            <div className="header-cell">地区</div>
            <div className="header-cell">世界赛次数</div>
          </div>
          {renderGuessRows()}
        </div>

        {gameStatus === 'playing' && !alreadyPlayed && (
          <div className="game-controls">
            <AutoComplete
              value={currentGuess}
              options={playerOptions}
              onSelect={handleSelect}
              onChange={handleAutoCompleteChange}
              filterOption={filterOption}
              placeholder="输入选手名称..."
              className="player-input"
              disabled={gameStatus !== 'playing' || alreadyPlayed}
            />
            <Button
              type="primary"
              onClick={handleSubmitGuess}
              className="submit-button"
              disabled={!currentGuess || loading}
            >
              提交
            </Button>
          </div>
        )}

        {renderGameStatus()}
        
        <div className="game-footer">
          {renderStats()}
          {renderInstructions()}
        </div>
      </div>
    </div>
  );
}

export default DailyPage; 