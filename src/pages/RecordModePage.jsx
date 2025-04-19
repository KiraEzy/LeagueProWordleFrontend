import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Typography, AutoComplete, Tooltip, Tag } from 'antd';
import { QuestionCircleOutlined, BugOutlined, TrophyOutlined } from '@ant-design/icons';
import './SinglePlayerPage.css'; // Reuse the same CSS for now

const { Title, Text, Paragraph } = Typography;

// Import the player data service instead of the JSON file
import { fetchAndFormatPlayers } from '../services/playerDataService';
// Import getRandomPlayer from offline service
import { getRandomPlayer } from '../services/offlinePlayerService';
// Import API functions
import { getDailyGame, submitGuess } from '../services/api';
// Import appearance settings component
import AppearanceSettings from '../components/AppearanceSettings';

// Set to true for development, false for production
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Translation map for nationalities
const nationalityTranslations = {
  "Korea": "韩国",
  "South Korea": "韩国",
  "China": "中国",
  "Taiwan": "中国台湾",
  "Hong Kong": "中国香港",
  "Macau": "中国澳门",
  "United States": "美国",
  "USA": "美国",
  "Canada": "加拿大",
  "Denmark": "丹麦",
  "Germany": "德国",
  "France": "法国",
  "Spain": "西班牙",
  "Sweden": "瑞典",
  "Norway": "挪威",
  "Poland": "波兰",
  "Bulgaria": "保加利亚",
  "Belgium": "比利时",
  "Netherlands": "荷兰",
  "Slovenia": "斯洛文尼亚",
  "Croatia": "克罗地亚",
  "Czech Republic": "捷克",
  "UK": "英国",
  "United Kingdom": "英国",
  "Romania": "罗马尼亚",
  "Slovakia": "斯洛伐克",
  "Vietnam": "越南",
  "Japan": "日本",
  "Australia": "澳大利亚",
  "Brazil": "巴西",
  "Turkey": "土耳其",
  "Russia": "俄罗斯",
  "Greece": "希腊",
  "Thailand": "泰国",
  "Indonesia": "印度尼西亚",
  "Malaysia": "马来西亚",
  "Philippines": "菲律宾",
  "Singapore": "新加坡",
  "Iceland": "冰岛",
  "Switzerland": "瑞士",
  "Portugal": "葡萄牙",
  "Ireland": "爱尔兰",
  "Finland": "芬兰",
  "Latvia": "拉脱维亚",
  "Estonia": "爱沙尼亚",
  "Lithuania": "立陶宛",
  "Ukraine": "乌克兰",
  "Hong Kong": "香港",
  "Macau": "澳门",
  "Mexico": "墨西哥",
  "Argentina": "阿根廷",
  "Chile": "智利",
  "Peru": "秘鲁",
  "New Zealand": "新西兰",
  "Italy": "意大利",
  "Austria": "奥地利",
  "Hungary": "匈牙利",
  "Serbia": "塞尔维亚",
  "Montenegro": "黑山",
  "Belarus": "白俄罗斯",
  "Armenia": "亚美尼亚",
  "Dominican Republic": "多米尼加共和国",
  "Ecuador": "厄瓜多尔",
  "India": "印度",
  "Iran": "伊朗",
  "Iraq": "伊拉克",
  "Israel": "以色列",
  "Japan": "日本",
  "Jordan": "约旦",
  "Kazakhstan": "哈萨克斯坦",
  "Lithuania": "立陶宛",
  "Moldova": "摩尔多瓦",
  "Mongolia": "蒙古",
  "Morocco": "摩洛哥",
  "Netherlands Antilles": "荷属安的列斯",
  "New Caledonia": "新喀里多尼亚",
  "Singapore": "新加坡",
  "South Africa": "南非",  
  "Uruguay": "乌拉圭",
  "Venezuela": "委内瑞拉"
};

// Function to translate nationality
const translateNationality = (nationality) => {
  if (!nationality) return "未知";
  return nationalityTranslations[nationality] || nationality;
};

// Function to calculate age from birthdate
const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  
  // Try to parse the date in different formats
  let birthdateObj;
  if (typeof birthdate === 'string') {
    // Try ISO format (YYYY-MM-DD)
    birthdateObj = new Date(birthdate);
    
    // If invalid, try DD/MM/YYYY format
    if (isNaN(birthdateObj.getTime())) {
      const parts = birthdate.split(/[\/\-\.]/);
      if (parts.length === 3) {
        // Try different date formats (MM/DD/YYYY, DD/MM/YYYY)
        birthdateObj = new Date(parts[2], parts[1] - 1, parts[0]); 
        
        // If still invalid, try MM/DD/YYYY
        if (isNaN(birthdateObj.getTime())) {
          birthdateObj = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    }
  }
  
  // If we couldn't parse the date or it's still invalid, return null
  if (!birthdateObj || isNaN(birthdateObj.getTime())) {
    return null;
  }
  
  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - birthdateObj.getFullYear();
  const monthDiff = today.getMonth() - birthdateObj.getMonth();
  
  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
    age--;
  }
  
  return age;
};

// Function to compare ages
const compareAge = (guessedBirthdate, targetBirthdate) => {
  if (!guessedBirthdate || !targetBirthdate) return 'unknown';
  
  const guessedDate = new Date(guessedBirthdate);
  const targetDate = new Date(targetBirthdate);
  
  if (isNaN(guessedDate) || isNaN(targetDate)) return 'unknown';
  
  const guessedAge = calculateAge(guessedDate);
  const targetAge = calculateAge(targetDate);
  
  if (guessedAge === targetAge) {
    return 'correct';
  } else if (Math.abs(guessedAge - targetAge) <= 2) {
    return 'close';
  } else {
    return 'incorrect';
  }
};

function RecordModePage() {
  const [loading, setLoading] = useState(true);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [targetPlayer, setTargetPlayer] = useState(null);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'
  const [gameStats, setGameStats] = useState({
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0},
    bestScore: null,
    averageScore: 0,
    totalGuesses: 0
  });
  const [playerOptions, setPlayerOptions] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [formattedPlayers, setFormattedPlayers] = useState({});
  const [nameToMainNameMap, setNameToMainNameMap] = useState({});
  // New state to track if there's an API error
  const [apiError, setApiError] = useState(false);

  const MAX_GUESSES = 10;

  // Format player data for consistent display and logic
  const formatPlayerData = (playerData) => {
    const formatted = {};
    const nameMap = {};
    
    Object.entries(playerData).forEach(([key, player]) => {
      // Format team display
      let formattedTeam = "Retired";
      
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
        formattedTeam = "Retired";
      } else {
        // Otherwise use their current team
        formattedTeam = player.current_team || player.team || "Unknown";
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
      // Load game stats from localStorage - use a different key for record mode
      const savedStats = localStorage.getItem('leagueProWordleRecordStats');
      if (savedStats) {
        setGameStats(JSON.parse(savedStats));
      }

      try {
        setLoading(true);
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
            label: `${key} (${player.formattedTeam} - ${player.tournament_role || 'Unknown'})`,
            searchTerms: searchTerms.map(name => name.toLowerCase()),
            mainName: key,
          };
        });
        
        setPlayerOptions(options);
        setAllPlayers(formatted);
        
        // For Record Mode, select a random player
        const randomPlayer = getRandomPlayer(playerEntries, 'record');
        setTargetPlayer(randomPlayer);
        setApiError(false);
        
        if (DEBUG_MODE) {
          console.log("Loaded player data with", playerEntries.length, "players");
        }
      } catch (error) {
        console.error("Error loading player data:", error);
        message.error("Failed to load player data from the server. Please check your connection and try again.");
        setApiError(true);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Save game stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem('leagueProWordleRecordStats', JSON.stringify(gameStats));
  }, [gameStats]);

  const handleInputChange = (value) => {
    setCurrentGuess(value);
  };

  const handleSelectPlayer = (value, option) => {
    // When a player is selected from the dropdown, use their main name
    setCurrentGuess(option.mainName);
  };

  const handleSubmitGuess = () => {
    // Validate current guess
    if (!currentGuess || !currentGuess.trim()) {
      message.error('请输入选手名称');
      return;
    }

    // Check if the player exists in our playerEntries
    const mainName = nameToMainNameMap[currentGuess.toLowerCase()];
    if (!mainName || !allPlayers[mainName]) {
      message.error('未找到该选手，请检查拼写或选择下拉列表中的选手');
      return;
    }

    // Get the guessed player data
    const guessedPlayer = allPlayers[mainName];

    // Check if this player was already guessed
    if (guesses.some(g => g.name.toLowerCase() === mainName.toLowerCase())) {
      message.warning('您已经猜过这个选手了');
      return;
    }

    // Prepare feedback with comparisons
    const feedback = {
      name: mainName,
      correct: mainName.toLowerCase() === targetPlayer.mainName.toLowerCase(),
      hints: {
        team: compareTeams(guessedPlayer.formattedTeam, targetPlayer.formattedTeam),
        role: compareAttribute(guessedPlayer.tournament_role, targetPlayer.tournament_role),
        nationality: compareNationality(guessedPlayer.nationality, targetPlayer.nationality),
        worldAppearances: compareWorldAppearances(
          guessedPlayer.worldAppearances || guessedPlayer.appearance, 
          targetPlayer.worldAppearances || targetPlayer.appearance
        ),
        age: compareAge(guessedPlayer.birthdate, targetPlayer.birthdate)
      }
    };

    // Update guesses state
    const newGuesses = [...guesses, feedback];
    setGuesses(newGuesses);
    setCurrentGuess('');

    // Check if the game is won
    if (feedback.correct) {
      setGameStatus('won');
      updateStats(true, newGuesses.length);
      return;
    }

    // Check if the game is lost (max attempts reached)
    if (newGuesses.length >= MAX_GUESSES) {
      setGameStatus('lost');
      updateStats(false);
    }
  };

  const compareTeams = (guessedTeam, targetTeam) => {
    if (!guessedTeam || !targetTeam) {
      return 'incorrect';
    }
    
    // If teams are exactly the same, return correct
    if (guessedTeam.toLowerCase() === targetTeam.toLowerCase()) {
      return 'correct';
    }
    
    // If both are retired, it's a match
    if (guessedTeam === 'Retired' && targetTeam === 'Retired') {
      return 'correct';
    }
    
    // If neither is retired and they are from the same region, return close
    if (guessedPlayer.current_team_region && targetPlayer.current_team_region &&
        guessedPlayer.current_team_region.toLowerCase() === targetPlayer.current_team_region.toLowerCase()) {
      return 'close';
    }
    
    // Otherwise return incorrect
    return 'incorrect';
  };

  const compareAttribute = (guessedAttribute, targetAttribute) => {
    if (!guessedAttribute || !targetAttribute) {
      return 'incorrect';
    }
    
    return guessedAttribute.toLowerCase() === targetAttribute.toLowerCase() 
      ? 'correct' 
      : 'incorrect';
  };

  const compareNationality = (guessedNationality, targetNationality) => {
    // If nationality is exactly the same, return correct
    if (guessedNationality?.toLowerCase() === targetNationality?.toLowerCase()) {
      return 'correct';
    }
    
    // If we get here, nationalities don't match
    return 'incorrect';
  };

  const compareWorldAppearances = (guessedAppearances, targetAppearances) => {
    if (guessedAppearances === targetAppearances) {
      return 'correct';
    }
    
    // Within 1-2 appearances difference is "close"
    const difference = Math.abs(guessedAppearances - targetAppearances);
    if (difference <= 2) {
      return 'close';
    }
    
    return 'incorrect';
  };

  const updateStats = (won, attempts = null) => {
    setGameStats(prevStats => {
      const newStats = { ...prevStats };
      newStats.played++;
      
      if (won) {
        newStats.won++;
        newStats.currentStreak++;
        if (attempts) {
          // Update guess distribution
          newStats.guessDistribution[attempts]++;
          
          // Update total guesses for average calculation
          newStats.totalGuesses += attempts;
          
          // Update best score (lowest number of attempts)
          if (!newStats.bestScore || attempts < newStats.bestScore) {
            newStats.bestScore = attempts;
          }
          
          // Recalculate average score
          newStats.averageScore = newStats.totalGuesses / newStats.won;
        }
      } else {
        newStats.currentStreak = 0;
      }
      
      if (newStats.currentStreak > newStats.maxStreak) {
        newStats.maxStreak = newStats.currentStreak;
      }
      
      return newStats;
    });
  };

  const startNewGame = () => {
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setLoading(true);
    
    // Select a new random player
    setTimeout(() => {
      const playerEntries = Object.entries(allPlayers);
      const randomPlayer = getRandomPlayer(playerEntries, 'record');
      setTargetPlayer(randomPlayer);
      setLoading(false);
    }, 1000);
  };

  // Filter options based on user input
  const filterOptions = (inputValue) => {
    if (!inputValue) return [];
    
    const lowerInput = inputValue.toLowerCase();
    
    return playerOptions.filter(option => 
      // Check if any of the player's names match the input
      option.searchTerms.some(term => term.includes(lowerInput))
    );
  };

  if (loading) {
    return (
      <div className="single-player-page loading">
        <Spin size="large" />
        <Text>Loading player data...</Text>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="error-container">
        <Title level={2}>Unable to Load Game Data</Title>
        <Paragraph>
          We couldn't connect to the game server. Please check your connection and try refreshing the page.
        </Paragraph>
        <Button type="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="single-player-page record-mode-page">
      <div className="game-header">
        <Title level={2}>记录模式 <TrophyOutlined style={{ color: '#FFB900' }} /></Title>
        <AppearanceSettings gameMode="record" />
        {/* Always show answer regardless of debug mode */}
        {/* <Tag color="blue" icon={<QuestionCircleOutlined />}>
          当前答案: {targetPlayer?.name} ({targetPlayer?.formattedTeam}
          {targetPlayer?.current_team_region ? ` - ${targetPlayer?.current_team_region}` : ''}, 
          {targetPlayer?.tournament_role}, {translateNationality(targetPlayer?.nationality)}
          {(targetPlayer?.residency || targetPlayer?.Residency) ? 
            ` / ${targetPlayer?.residency || targetPlayer?.Residency}` : ''})
        </Tag> */}
        <div className="game-rules">
          <Paragraph>
            尽可能少的尝试次数猜出英雄联盟职业选手，创造您的最佳记录！
          </Paragraph>
          <div className="rules-container">
            <Paragraph className="rule-item">
              <span className="cell-example correct"></span> 
              <span>属性完全匹配</span>
            </Paragraph>
            <Paragraph className="rule-item">
              <span className="cell-example close"></span> 
              <span>接近匹配（世界赛±2，国家相同区域，战队相同赛区）</span>
            </Paragraph>
            <Paragraph className="rule-item">
              <span className="cell-example incorrect"></span> 
              <span>属性不匹配</span>
            </Paragraph>
          </div>
        </div>
        <Text type="secondary">您还剩 {MAX_GUESSES - guesses.length} 次猜测机会</Text>
      </div>

      <div className="game-board">
        <div className="guess-header">
          <div className="attribute-header">选手</div>
          <div className="attribute-header">
            战队
            <Tooltip title="完全匹配战队（绿色），相同赛区战队（橙色），或已退役（灰色）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            年龄
            <Tooltip title="完全匹配年龄（绿色），相差一年（橙色）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            位置
            <Tooltip title="世界赛上的位置（可能与当前角色不同）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            国籍
            <Tooltip title="完全匹配国籍（绿色）或相同赛区（橙色）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            世界赛/MSI
            <Tooltip title="世界赛和MSI的出场次数">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
        </div>

        {guesses.map((guess, index) => (
          <div key={index} className="guess-row">
            <div className={`guess-cell ${guess.correct ? 'correct' : 'incorrect'}`}>
              {guess.name}
            </div>
            <div className={`guess-cell ${guess.hints.team}`}>
              {guess.hints.team === 'correct' ? targetPlayer.formattedTeam : 
               allPlayers[guess.name]?.formattedTeam || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.age}`}>
              {calculateAge(allPlayers[guess.name]?.birthdate) || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.role}`}>
              {guess.hints.role === 'correct' ? targetPlayer.tournament_role : 
               allPlayers[guess.name]?.tournament_role || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.nationality}`}>
              {translateNationality(allPlayers[guess.name]?.nationality) || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.worldAppearances}`}>
              {guess.hints.worldAppearances === 'correct' ? targetPlayer.worldAppearances : 
               allPlayers[guess.name]?.appearance || '?'}
            </div>
          </div>
        ))}

        {/* Empty rows for remaining guesses */}
        {Array.from({ length: MAX_GUESSES - guesses.length }).map((_, index) => (
          <div key={`empty-${index}`} className="guess-row empty">
            <div className="guess-cell"></div>
            <div className="guess-cell"></div>
            <div className="guess-cell"></div>
            <div className="guess-cell"></div>
            <div className="guess-cell"></div>
            <div className="guess-cell"></div>
          </div>
        ))}
      </div>

      {gameStatus === 'playing' ? (
        <div className="game-controls">
          <AutoComplete
            value={currentGuess}
            options={filterOptions(currentGuess)}
            onSelect={handleSelectPlayer}
            onChange={handleInputChange}
            placeholder="输入选手名称"
            disabled={gameStatus !== 'playing'}
            style={{ width: '100%' }}
            filterOption={false}
          />
          <Button 
            type="primary"
            onClick={handleSubmitGuess}
            disabled={gameStatus !== 'playing' || !currentGuess.trim()}
          >
            提交
          </Button>
        </div>
      ) : (
        <div className="game-over">
          <Title level={3}>
            {gameStatus === 'won' ? '恭喜！' : '游戏结束！'}
          </Title>
          <Text>
            {gameStatus === 'won' 
              ? `您用了 ${guesses.length} 次尝试猜出了 ${targetPlayer.mainName}。`
              : `正确答案是 ${targetPlayer.mainName}。`
            }
          </Text>
          <Button type="primary" onClick={startNewGame}>
            再玩一次
          </Button>
        </div>
      )}

      <div className="game-stats">
        <Title level={4}>您的记录统计</Title>
        <div className="stats-grid record-stats">
          <div className="stat-item">
            <div className="stat-value">{gameStats.played}</div>
            <div className="stat-label">已玩</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {gameStats.played > 0 
                ? Math.round((gameStats.won / gameStats.played) * 100) 
                : 0}%
            </div>
            <div className="stat-label">胜率</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{gameStats.bestScore || '-'}</div>
            <div className="stat-label">最佳成绩</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {gameStats.averageScore ? gameStats.averageScore.toFixed(1) : '-'}
            </div>
            <div className="stat-label">平均成绩</div>
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
    </div>
  );
}

export default RecordModePage; 