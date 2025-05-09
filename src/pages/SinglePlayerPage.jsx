import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Typography, AutoComplete, Tooltip, Tag, Modal } from 'antd';
import { QuestionCircleOutlined, BugOutlined, RedoOutlined, EyeOutlined } from '@ant-design/icons';
import './SinglePlayerPage.css';

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

// Function to calculate age from birthdate
const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  
  // Parse the birthdate string (could be in YYYY-MM-DD format)
  const birthdateObj = new Date(birthdate);
  if (isNaN(birthdateObj.getTime())) return null; // Invalid date
  
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

// Function to translate nationality
const translateNationality = (nationality) => {
  if (!nationality) return "未知";
  return nationalityTranslations[nationality] || nationality;
};

// Compare age function - returns feedback for the age column
const compareAge = (guessedAge, targetAge) => {
  if (guessedAge === null || targetAge === null) return 'incorrect';
  
  if (guessedAge === targetAge) return 'correct';
  
  // Within +/- 1 year is considered close
  if (Math.abs(guessedAge - targetAge) <= 1) return 'close';
  
  return 'incorrect';
};

function SinglePlayerPage() {
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
    guessDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0}
  });
  const [playerOptions, setPlayerOptions] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [formattedPlayers, setFormattedPlayers] = useState({});
  const [nameToMainNameMap, setNameToMainNameMap] = useState({});
  // New state to track if there's an API error
  const [apiError, setApiError] = useState(false);
  // State for modal visibility
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [answerModalVisible, setAnswerModalVisible] = useState(false);

  const MAX_GUESSES = 10;

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
      // Load game stats from localStorage
      const savedStats = localStorage.getItem('leagueProWordleStats');
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
        console.log(playerEntries);
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
        
        // Instead of selecting a random player, get the daily answer from backend
        // But for the SinglePlayer mode, we'll select a random player
        // This way we ensure consistent answers for daily mode but still allow
        // unlimited play in single player mode
        const randomPlayer = getRandomPlayer(playerEntries, 'practice');
        
        // Ensure the target player has the right structure with mainName
        if (randomPlayer) {
          // Find the key (player name) that matches this player's data
          const playerKey = playerEntries.find(([_, playerData]) => 
            playerData === randomPlayer || 
            (playerData.id && randomPlayer.id && playerData.id === randomPlayer.id)
          )?.[0];
          
          // Set the target player with the proper name and mainName fields
          setTargetPlayer({
            ...randomPlayer,
            name: playerKey || randomPlayer.name || randomPlayer.main_name || 'Unknown',
            mainName: playerKey || randomPlayer.main_name || randomPlayer.name || 'Unknown'
          });
          
          if (DEBUG_MODE) {
            console.log("Loaded player data with", playerEntries.length, "players");
            console.log("Initial target player:", playerKey || randomPlayer.name || randomPlayer.main_name);
          }
        } else {
          console.error("Failed to generate initial target player");
          message.error('无法生成目标选手，请刷新页面重试');
        }
        
        setApiError(false);
      } catch (error) {
        console.error("Error loading player data:", error);
        message.error("无法从服务器加载玩家数据。请检查您的网络连接并重试。");
        setApiError(true);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Save game stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem('leagueProWordleStats', JSON.stringify(gameStats));
  }, [gameStats]);

  const handleInputChange = (value) => {
    setCurrentGuess(value);
  };

  const handleSelectPlayer = (value, option) => {
    // When a player is selected from the dropdown, use their main name
    setCurrentGuess(option.mainName);
  };

  const handleSubmitGuess = () => {
    if (!currentGuess.trim()) {
      message.warning('请输入选手名称');
      return;
    }

    // Check if the guessed player exists in our data
    // First, try to find by exact name match
    let mainPlayerName = Object.keys(allPlayers).find(
      name => name.toLowerCase() === currentGuess.toLowerCase()
    );
    
    // If not found by exact name, check if it's an alternate name
    if (!mainPlayerName) {
      mainPlayerName = nameToMainNameMap[currentGuess.toLowerCase()];
    }

    if (!mainPlayerName) {
      message.warning('未找到该选手。请输入一个有效的选手名称。');
      return;
    }

    const guessedPlayer = allPlayers[mainPlayerName];
    
    // Check if the guess is correct
    const isCorrect = targetPlayer && mainPlayerName.toLowerCase() === (targetPlayer.mainName || targetPlayer.name || '').toLowerCase();
    
    if (DEBUG_MODE) {
      console.log("Guess check:", {
        guessedName: mainPlayerName.toLowerCase(),
        targetName: targetPlayer?.mainName?.toLowerCase() || targetPlayer?.name?.toLowerCase(),
        isCorrect
      });
    }
    
    // Compare attributes to provide feedback
    const teamFeedback = compareTeams(
      guessedPlayer.formattedTeam, 
      targetPlayer.formattedTeam,
      guessedPlayer,
      targetPlayer
    );
    
    // Calculate ages
    const guessedAge = calculateAge(guessedPlayer.birthdate);
    const targetAge = calculateAge(targetPlayer.birthdate);
    const ageFeedback = compareAge(guessedAge, targetAge);
    
    const roleFeedback = compareAttribute('tournament_role', guessedPlayer, targetPlayer);
    const nationalityFeedback = compareNationality(guessedPlayer, targetPlayer);
    const appearanceFeedback = compareWorldAppearances(
      parseInt(guessedPlayer.appearance) || 0, 
      parseInt(targetPlayer.appearance) || 0
    );
    
    // Construct the new guess object
    const newGuess = {
      name: mainPlayerName,
      correct: isCorrect,
      hints: {
        team: teamFeedback,
        age: ageFeedback,
        role: roleFeedback,
        nationality: nationalityFeedback,
        worldAppearances: appearanceFeedback
      }
    };
    
    // Add the guess to the list
    const updatedGuesses = [...guesses, newGuess];
    setGuesses(updatedGuesses);
    setCurrentGuess('');
    
    // Check win condition
    if (isCorrect) {
      setGameStatus('won');
      updateStats(true, updatedGuesses.length);
      message.success(`恭喜！您猜对了！用了 ${updatedGuesses.length} 次尝试。`);
    } 
    // Check lose condition
    else if (updatedGuesses.length >= MAX_GUESSES) {
      setGameStatus('lost');
      updateStats(false);
      message.error(`游戏结束！正确答案是 ${targetPlayer.name}。`);
    }
  };

  // Compare teams and provide feedback
  const compareTeams = (guessedTeam, targetTeam, guessedPlayer, targetPlayer) => {
    // If teams are exactly the same, it's correct
    if (guessedTeam === targetTeam) return 'correct';
    
    // If both are retired, that's also correct
    if (guessedTeam === '退役' && targetTeam === '退役') return 'correct';
    
    // If one is retired and the other isn't, that's incorrect
    if ((guessedTeam === '退役' && targetTeam !== '退役') || 
        (guessedTeam !== '退役' && targetTeam === '退役')) {
      return 'incorrect';
    }
    
    // Check if they're in the same region (for close match)
    const guessedRegion = guessedPlayer.current_team_region || '';
    const targetRegion = targetPlayer.current_team_region || '';
    
    if (guessedRegion && targetRegion && guessedRegion === targetRegion) {
      return 'close';
    }
    
    // Otherwise incorrect
    return 'incorrect';
  };

  // Generic attribute comparison
  const compareAttribute = (attribute, guessedPlayer, targetPlayer) => {
    const guessedValue = guessedPlayer[attribute];
    const targetValue = targetPlayer[attribute];
    
    if (guessedValue === targetValue) return 'correct';
    return 'incorrect';
  };
  
  // Special handling for nationality comparison
  const compareNationality = (guessedPlayer, targetPlayer) => {
    const guessedNationality = guessedPlayer.nationality;
    const targetNationality = targetPlayer.nationality;
    
    // Exact match
    if (guessedNationality === targetNationality) return 'correct';
    
    // Check if they have the same residency (for close match)
    const guessedResidency = guessedPlayer.residency;
    const targetResidency = targetPlayer.residency;
    
    if (guessedResidency && targetResidency && 
        guessedResidency.toLowerCase() === targetResidency.toLowerCase() && 
        guessedNationality !== targetNationality) {
      return 'close';
    }
    
    return 'incorrect';
  };
  
  // Special handling for World appearances comparison
  const compareWorldAppearances = (guessedAppearances, targetAppearances) => {
    // Exact match
    if (guessedAppearances === targetAppearances) return 'correct';
    
    // Within 2 is close
    const diff = Math.abs(guessedAppearances - targetAppearances);
    if (diff <= 2) return 'close';
    
    return 'incorrect';
  };

  // Update game statistics
  const updateStats = (won, attempts = null) => {
    setGameStats(prevStats => {
      const newStats = { ...prevStats };
      newStats.played++;
      
      if (won) {
        newStats.won++;
        newStats.currentStreak++;
        
        // Update guess distribution
        if (attempts) {
          if (!newStats.guessDistribution) {
            newStats.guessDistribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0};
          }
          newStats.guessDistribution[attempts] = (newStats.guessDistribution[attempts] || 0) + 1;
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

  // Start a new game
  const startNewGame = () => {
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    const playerEntries = Object.entries(formattedPlayers);
    const newTarget = getRandomPlayer(playerEntries, 'practice');
    
    // Ensure the target player has the right structure with mainName
    if (newTarget) {
      // Find the key (player name) that matches this player's data
      const playerKey = playerEntries.find(([_, playerData]) => 
        playerData === newTarget || 
        (playerData.id && newTarget.id && playerData.id === newTarget.id)
      )?.[0];
      
      // Set the target player with the proper name and mainName fields
      const updatedTarget = {
        ...newTarget,
        name: playerKey || newTarget.name || newTarget.main_name || 'Unknown',
        mainName: playerKey || newTarget.main_name || newTarget.name || 'Unknown'
      };
      
      setTargetPlayer(updatedTarget);
      
      message.success('已重新生成目标选手！');
      
      if (DEBUG_MODE) {
        console.log("New game started with target:", updatedTarget);
      }
    } else {
      console.error("Failed to generate new target player");
      message.error('无法生成新选手，请刷新页面重试');
    }
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

  // Handle showing answer
  const handleShowAnswer = () => {
    setConfirmModalVisible(true);
  };

  // Handle confirm showing answer
  const handleConfirmShowAnswer = () => {
    setConfirmModalVisible(false);
    setGameStatus('lost');
    updateStats(false);
    setAnswerModalVisible(true);
  };

  if (loading) {
    return (
      <div className="single-player-page loading">
        <Spin size="large" />
        <Text>加载中...</Text>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="error-container">
        <Title level={2}>无法加载游戏</Title>
        <Paragraph>
          无法连接到游戏服务器。请检查您的网络连接并刷新页面。
        </Paragraph>
        <Button type="primary" onClick={() => window.location.reload()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="single-player-page">
      <div className="game-header">
        <Title level={2}>练习模式</Title>
        <div className="settings-row">
          <AppearanceSettings gameMode="practice" />
          <Button 
            type="default" 
            icon={<RedoOutlined />} 
            onClick={startNewGame}
            className="regenerate-button"
          >
            <Tooltip title="使用当前权重设置重新生成一名随机选手">
              重新生成选手
            </Tooltip>
          </Button>
          {gameStatus === 'playing' && (
            <Button 
              type="default" 
              icon={<EyeOutlined />} 
              onClick={handleShowAnswer}
              className="show-answer-button"
            >
              <Tooltip title="注意：查看答案将被视为放弃本局游戏">
                显示答案
              </Tooltip>
            </Button>
          )}
        </div>
        <div className="game-rules">
          <Paragraph>
            猜出曾参加过世界赛的英雄联盟职业选手，您有 <strong>{MAX_GUESSES}</strong> 次尝试机会。
          </Paragraph>
          <div className="rules-container">
            <Paragraph className="rule-item">
              <span className="cell-example correct"></span> 
              <span>属性正确</span>
            </Paragraph>
            <Paragraph className="rule-item">
              <span className="cell-example close"></span> 
              <span>接近（世界赛次数相差±2，相同居住地，相同赛区）</span>
            </Paragraph>
            <Paragraph className="rule-item">
              <span className="cell-example incorrect"></span> 
              <span>属性错误</span>
            </Paragraph>
          </div>
        </div>
      </div>

      <div className="game-board">
        <div className="guess-header">
          <div className="attribute-header">选手</div>
          <div className="attribute-header">
            战队
            <Tooltip title="完全匹配战队（绿色），相同赛区（橙色），或退役（退役选手）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            年龄
            <Tooltip title="完全匹配年龄（绿色），相差1岁（橙色）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            位置
            <Tooltip title="在世界赛上的位置（可能与当前位置不同）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            地区
            <Tooltip title="完全匹配地区（绿色）或相同居住地（橙色）">
              <QuestionCircleOutlined className="header-icon" />
            </Tooltip>
          </div>
          <div className="attribute-header">
            世界赛/MSI次数
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
              {allPlayers[guess.name]?.formattedTeam || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.age}`}>
              {calculateAge(allPlayers[guess.name]?.birthdate) || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.role}`}>
              {allPlayers[guess.name]?.tournament_role || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.nationality}`}>
              {translateNationality(allPlayers[guess.name]?.nationality) || '?'}
            </div>
            <div className={`guess-cell ${guess.hints.worldAppearances}`}>
              {allPlayers[guess.name]?.appearance || '?'}
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
            style={{ width: '100%' }}
            filterOption={false}
            className="player-input"
          />
          <Button 
            type="primary" 
            onClick={handleSubmitGuess}
            disabled={!currentGuess.trim()}
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
              ? `您用了 ${guesses.length} 次尝试猜出了正确答案。`
              : `正确答案是 ${targetPlayer.name}。`
            }
          </Text>
          <Button type="primary" onClick={startNewGame} style={{ marginTop: '20px' }}>
            开始新游戏
          </Button>
        </div>
      )}
      
      <div className="game-stats">
        <Title level={4}>游戏统计</Title>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{gameStats.played}</div>
            <div className="stat-label">总游戏</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {gameStats.played ? Math.round((gameStats.won / gameStats.played) * 100) : 0}%
            </div>
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

      {/* Modals */}
      <Modal
        title="确认查看答案"
        open={confirmModalVisible}
        onOk={handleConfirmShowAnswer}
        onCancel={() => setConfirmModalVisible(false)}
        okText="继续查看"
        cancelText="取消"
      >
        <p>查看答案将被视为放弃本局游戏。是否继续？</p>
      </Modal>

      <Modal
        title="当前答案"
        open={answerModalVisible}
        onOk={() => setAnswerModalVisible(false)}
        onCancel={() => setAnswerModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setAnswerModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div>
          <p><strong>选手名称:</strong> {targetPlayer?.name || '未知'}</p>
          <p><strong>战队:</strong> {targetPlayer?.formattedTeam || '未知'}</p>
          <p><strong>年龄:</strong> {calculateAge(targetPlayer?.birthdate) || '未知'}</p>
          <p><strong>位置:</strong> {targetPlayer?.tournament_role || '未知'}</p>
          <p><strong>地区:</strong> {translateNationality(targetPlayer?.nationality) || '未知'}</p>
          <p><strong>世界赛/MSI次数:</strong> {targetPlayer?.appearance || targetPlayer?.worldAppearances || '未知'}</p>
        </div>
      </Modal>
    </div>
  );
}

export default SinglePlayerPage; 