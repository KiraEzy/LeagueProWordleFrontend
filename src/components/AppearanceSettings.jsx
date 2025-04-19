import React, { useState, useEffect } from 'react';
import { Card, Slider, Typography, Button, Tooltip, Space, Divider } from 'antd';
import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import './AppearanceSettings.css';

const { Title, Text } = Typography;

// Default weights for player appearance groups
const DEFAULT_WEIGHTS = {
  low: 15,   // 1-2 appearances (15%)
  medium: 25, // 3-5 appearances (25%)
  high: 60,   // 6+ appearances (60%)
};

// Default retired player probability (50%)
const DEFAULT_RETIRED_PROBABILITY = 30;

function AppearanceSettings({ gameMode }) {
  const [visible, setVisible] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tempWeights, setTempWeights] = useState(DEFAULT_WEIGHTS);
  const [retiredProbability, setRetiredProbability] = useState(DEFAULT_RETIRED_PROBABILITY);
  const [tempRetiredProbability, setTempRetiredProbability] = useState(DEFAULT_RETIRED_PROBABILITY);
  
  // Determine localStorage keys based on game mode
  const storageKey = 
    gameMode === 'record' ? 'leagueProWordleRecordAppearanceWeights' :
    gameMode === 'daily' ? 'leagueProWordleDailyAppearanceWeights' :
    'leagueProWordleAppearanceWeights'; // default for practice mode
    
  const retiredStorageKey = 
    gameMode === 'record' ? 'leagueProWordleRecordRetiredWeight' :
    gameMode === 'daily' ? 'leagueProWordleDailyRetiredWeight' :
    'leagueProWordleRetiredWeight'; // default for practice mode
  
  // Load saved weights from localStorage on mount
  useEffect(() => {
    const savedWeights = localStorage.getItem(storageKey);
    if (savedWeights) {
      try {
        const parsed = JSON.parse(savedWeights);
        setWeights(parsed);
        setTempWeights(parsed);
      } catch (e) {
        console.error('Failed to parse saved weights:', e);
        resetToDefaults();
      }
    }
    
    const savedRetiredProb = localStorage.getItem(retiredStorageKey);
    if (savedRetiredProb) {
      try {
        const parsed = parseInt(savedRetiredProb, 10);
        setRetiredProbability(parsed);
        setTempRetiredProbability(parsed);
      } catch (e) {
        console.error('Failed to parse saved retired probability:', e);
        setRetiredProbability(DEFAULT_RETIRED_PROBABILITY);
        setTempRetiredProbability(DEFAULT_RETIRED_PROBABILITY);
      }
    }
  }, [storageKey, retiredStorageKey]);
  
  // Save weights to localStorage when they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(weights));
  }, [weights, storageKey]);
  
  // Save retired probability to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(retiredStorageKey, retiredProbability.toString());
  }, [retiredProbability, retiredStorageKey]);
  
  const toggleVisibility = () => {
    setVisible(!visible);
    // Reset temp values to current values when opening
    if (!visible) {
      setTempWeights({...weights});
      setTempRetiredProbability(retiredProbability);
    }
  };
  
  const handleLowWeightChange = (value) => {
    // Ensure the total is still 100%
    const highValue = tempWeights.high;
    const mediumValue = 100 - value - highValue;
    
    setTempWeights({
      low: value,
      medium: Math.max(0, mediumValue),
      high: highValue
    });
  };
  
  const handleMediumWeightChange = (value) => {
    // Ensure the total is still 100%
    const lowValue = tempWeights.low;
    const highValue = 100 - lowValue - value;
    
    setTempWeights({
      low: lowValue,
      medium: value,
      high: Math.max(0, highValue)
    });
  };
  
  const handleHighWeightChange = (value) => {
    // Ensure the total is still 100%
    const lowValue = tempWeights.low;
    const mediumValue = 100 - lowValue - value;
    
    setTempWeights({
      low: lowValue,
      medium: Math.max(0, mediumValue),
      high: value
    });
  };
  
  const handleRetiredProbabilityChange = (value) => {
    setTempRetiredProbability(value);
  };
  
  const saveChanges = () => {
    // Adjust weights to ensure they sum to 100%
    const total = tempWeights.low + tempWeights.medium + tempWeights.high;
    const adjustedWeights = {
      low: Math.round((tempWeights.low / total) * 100),
      medium: Math.round((tempWeights.medium / total) * 100),
      high: Math.round((tempWeights.high / total) * 100)
    };
    
    // Ensure they add up to exactly 100 (could be off by 1 due to rounding)
    const sum = adjustedWeights.low + adjustedWeights.medium + adjustedWeights.high;
    if (sum !== 100) {
      adjustedWeights.medium += (100 - sum);
    }
    
    setWeights(adjustedWeights);
    setRetiredProbability(tempRetiredProbability);
    setVisible(false);
    
    // For daily mode, trigger a special localStorage flag to reload daily challenge
    if (gameMode === 'daily') {
      localStorage.setItem('leagueProWordleDailySettingsChanged', 'true');
    }
  };
  
  const resetToDefaults = () => {
    setTempWeights({...DEFAULT_WEIGHTS});
    setWeights({...DEFAULT_WEIGHTS});
    setTempRetiredProbability(DEFAULT_RETIRED_PROBABILITY);
    setRetiredProbability(DEFAULT_RETIRED_PROBABILITY);
  };
  
  const cancelChanges = () => {
    setTempWeights({...weights});
    setTempRetiredProbability(retiredProbability);
    setVisible(false);
  };
  
  // Get localized title based on game mode
  const getSettingsTitle = () => {
    switch(gameMode) {
      case 'daily':
        return '每日挑战权重设置';
      case 'record':
        return '记录模式权重设置';
      default:
        return '练习模式权重设置';
    }
  };
  
  return (
    <div className="appearance-settings">
      <Tooltip title="配置选手出现权重">
        <Button 
          type="text" 
          icon={<SettingOutlined />} 
          onClick={toggleVisibility}
          className="settings-button"
        >
          选手配置
        </Button>
      </Tooltip>
      
      {visible && (
        <Card className="settings-card">
          <Title level={4}>
            {getSettingsTitle()}
            <Tooltip title="设置不同出场次数选手的出现频率。较高的百分比意味着那些选手将更频繁地出现。">
              <QuestionCircleOutlined className="info-icon" />
            </Tooltip>
          </Title>
          
          <div className="weight-slider">
            <Text>低出场次数 (1-2 次)</Text>
            <Slider
              value={tempWeights.low}
              onChange={handleLowWeightChange}
              min={0}
              max={100}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%'
              }}
            />
            <Text className="weight-value">{tempWeights.low}%</Text>
          </div>
          
          <div className="weight-slider">
            <Text>中等出场次数 (3-5 次)</Text>
            <Slider
              value={tempWeights.medium}
              onChange={handleMediumWeightChange}
              min={0}
              max={100}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%'
              }}
            />
            <Text className="weight-value">{tempWeights.medium}%</Text>
          </div>
          
          <div className="weight-slider">
            <Text>高出场次数 (6+ 次)</Text>
            <Slider
              value={tempWeights.high}
              onChange={handleHighWeightChange}
              min={0}
              max={100}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%'
              }}
            />
            <Text className="weight-value">{tempWeights.high}%</Text>
          </div>
          
          <div className="total-weight">
            <Text>总计: {tempWeights.low + tempWeights.medium + tempWeights.high}%</Text>
            {tempWeights.low + tempWeights.medium + tempWeights.high !== 100 && (
              <Text type="danger"> (总计必须为 100%)</Text>
            )}
          </div>
          
          <Divider />
          
          <Title level={5}>
            退役选手概率
            <Tooltip title="控制退役选手在随机选择中出现的概率。设为0则只会抽取在役选手，设为100则只会抽取退役选手。">
              <QuestionCircleOutlined className="info-icon" />
            </Tooltip>
          </Title>
          
          <div className="weight-slider">
            <Text>退役选手出现概率</Text>
            <Slider
              value={tempRetiredProbability}
              onChange={handleRetiredProbabilityChange}
              min={0}
              max={100}
              marks={{
                0: '0%',
                50: '50%',
                100: '100%'
              }}
            />
            <div className="slider-labels">
              <Text className="slider-label-left">只抽取在役选手</Text>
              <Text className="weight-value">{tempRetiredProbability}%</Text>
              <Text className="slider-label-right">只抽取退役选手</Text>
            </div>
          </div>
          
          <div className="settings-actions">
            <Space>
              <Button onClick={cancelChanges}>取消</Button>
              <Button onClick={resetToDefaults}>重置默认值</Button>
              <Button 
                type="primary" 
                onClick={saveChanges}
                disabled={tempWeights.low + tempWeights.medium + tempWeights.high !== 100}
              >
                保存更改
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AppearanceSettings; 