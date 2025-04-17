import React, { useState, useEffect } from 'react';
import { Card, Slider, Typography, Button, Tooltip, Space } from 'antd';
import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import './AppearanceSettings.css';

const { Title, Text } = Typography;

// Default weights for player appearance groups
const DEFAULT_WEIGHTS = {
  low: 15,   // 1-2 appearances (10%)
  medium: 25, // 3-5 appearances (30%)
  high: 60,   // 6+ appearances (60%)
};

function AppearanceSettings({ gameMode }) {
  const [visible, setVisible] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tempWeights, setTempWeights] = useState(DEFAULT_WEIGHTS);
  
  // Determine localStorage key based on game mode
  const storageKey = gameMode === 'record' 
    ? 'leagueProWordleRecordAppearanceWeights' 
    : 'leagueProWordleAppearanceWeights';
  
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
  }, [storageKey]);
  
  // Save weights to localStorage when they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(weights));
  }, [weights, storageKey]);
  
  const toggleVisibility = () => {
    setVisible(!visible);
    // Reset temp weights to current weights when opening
    if (!visible) {
      setTempWeights({...weights});
    }
  };
  
  const handleLowWeightChange = (value) => {
    const remaining = 100 - value - tempWeights.high;
    setTempWeights({
      low: value,
      medium: Math.max(0, remaining),
      high: tempWeights.high
    });
  };
  
  const handleMediumWeightChange = (value) => {
    const remaining = 100 - tempWeights.low - tempWeights.high;
    setTempWeights({
      ...tempWeights,
      medium: value
    });
  };
  
  const handleHighWeightChange = (value) => {
    const remaining = 100 - tempWeights.low - value;
    setTempWeights({
      low: tempWeights.low,
      medium: Math.max(0, remaining),
      high: value
    });
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
    setVisible(false);
  };
  
  const resetToDefaults = () => {
    setTempWeights({...DEFAULT_WEIGHTS});
    setWeights({...DEFAULT_WEIGHTS});
  };
  
  const cancelChanges = () => {
    setTempWeights({...weights});
    setVisible(false);
  };
  
  return (
    <div className="appearance-settings">
      <Tooltip title="Configure player appearance weights">
        <Button 
          type="text" 
          icon={<SettingOutlined />} 
          onClick={toggleVisibility}
          className="settings-button"
        >
          Appearance Settings
        </Button>
      </Tooltip>
      
      {visible && (
        <Card className="settings-card">
          <Title level={4}>
            Player Appearance Weights 
            <Tooltip title="Configure how often players with different numbers of World appearances are selected. Higher percentages mean those players will appear more frequently.">
              <QuestionCircleOutlined className="info-icon" />
            </Tooltip>
          </Title>
          
          <div className="weight-slider">
            <Text>Rarely Seen (1-2 appearances)</Text>
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
            <Text>Average (3-5 appearances)</Text>
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
            <Text>Veterans (6+ appearances)</Text>
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
            <Text>Total: {tempWeights.low + tempWeights.medium + tempWeights.high}%</Text>
            {tempWeights.low + tempWeights.medium + tempWeights.high !== 100 && (
              <Text type="danger"> (Total must be 100%)</Text>
            )}
          </div>
          
          <div className="settings-actions">
            <Space>
              <Button onClick={cancelChanges}>Cancel</Button>
              <Button onClick={resetToDefaults}>Reset to Defaults</Button>
              <Button 
                type="primary" 
                onClick={saveChanges}
                disabled={tempWeights.low + tempWeights.medium + tempWeights.high !== 100}
              >
                Save Changes
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
}

export default AppearanceSettings; 