import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import './App.css'
import HomePage from './components/HomePage'
import PlayPage from './pages/PlayPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AboutPage from './pages/AboutPage'
import SinglePlayerPage from './pages/SinglePlayerPage'
import DailyPage from './pages/DailyPage'
import RecordModePage from './pages/RecordModePage'
import UserRegistration from './components/UserRegistration'
import ServerStatus from './components/ServerStatus'
import TestPage from './pages/TestPage'
import NotFoundPage from './pages/NotFoundPage'

// Define LeagueProWordle theme colors for Ant Design
const theme = {
  token: {
    colorPrimary: '#C89B3C',
    colorLink: '#C89B3C',
    colorSuccess: '#44B56D',
    colorWarning: '#FFB93B',
    colorError: '#EF476F',
    colorBgBase: '#FFFFFF',
    borderRadius: 4,
  },
  components: {
    Button: {
      primaryColor: '#FFFFFF',
      primaryHoverBg: '#A17623',
    },
    Modal: {
      titleColor: '#0A1428',
    },
    Dropdown: {
      controlItemBgHover: 'rgba(200, 155, 60, 0.1)',
    },
  },
};

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollbarWidthRef = useRef(0);
  
  // Calculate scrollbar width on mount
  useEffect(() => {
    // Calculate scrollbar width
    const scrollDiv = document.createElement('div');
    scrollDiv.style.width = '100px';
    scrollDiv.style.height = '100px';
    scrollDiv.style.overflow = 'scroll';
    scrollDiv.style.position = 'absolute';
    scrollDiv.style.top = '-9999px';
    document.body.appendChild(scrollDiv);
    
    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    scrollbarWidthRef.current = scrollbarWidth;
    
    document.body.removeChild(scrollDiv);
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const scrollbarWidth = scrollbarWidthRef.current;
      
      // Apply to body but keep the width consistent
      document.body.style.overflow = 'hidden';
      document.body.classList.add('menu-open');
      
      // Only adjust the header's padding
      const header = document.querySelector('.header');
      // if (header) {
      //   header.style.paddingRight = `${15 + scrollbarWidth}px`;
      // }
      
      // Keep the content width consistent
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.style.position = 'relative';
        appContainer.style.left = '0';
      }
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
      
      // Reset styles
      const header = document.querySelector('.header');
      if (header) {
        header.style.paddingRight = '';
      }
      
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.style.width = '';
        appContainer.style.position = '';
        appContainer.style.left = '';
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
      
      const header = document.querySelector('.header');
      if (header) {
        header.style.paddingRight = '';
      }
      
      const appContainer = document.querySelector('.app-container');
      if (appContainer) {
        appContainer.style.width = '';
        appContainer.style.position = '';
        appContainer.style.left = '';
      }
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleRegister = () => {
    closeMobileMenu();
    // Refresh the page after successful registration
    window.location.reload();
  };

  return (
    <ConfigProvider theme={theme}>
      <Router>
        <div className="app-container">
          <header className="header">
            <div className="logo-container">
              <Link to="/" onClick={closeMobileMenu}>
                <h1>英雄联盟猜选手</h1>
                <span className="offline-badge">离线模式</span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="main-nav desktop-nav">
              <ul>
                <li>
                  <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
                    首页
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/play" className={({ isActive }) => isActive ? "active" : ""}>
                    游戏
                  </NavLink>
                </li>
              </ul>
            </nav>
            
            {/* Desktop Header Actions */}
            <div className="header-actions desktop-actions">
              {/* UserRegistration component removed */}
            </div>
            
            {/* Mobile Menu Button */}
            <button className="mobile-menu-button" onClick={toggleMobileMenu} aria-label="Menu">
              <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </header>
          
          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>}
          
          {/* Mobile Menu */}
          <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <nav className="mobile-nav">
              <ul>
                <li>
                  <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""} onClick={closeMobileMenu}>
                    首页
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/play" className={({ isActive }) => isActive ? "active" : ""} onClick={closeMobileMenu}>
                    游戏
                  </NavLink>
                </li>
              </ul>
              <div className="mobile-actions">
                {/* UserRegistration component removed */}
              </div>
            </nav>
          </div>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/play" element={<PlayPage />} />
              <Route path="/single-player" element={<SinglePlayerPage />} />
              <Route path="/daily" element={<DailyPage />} />
              <Route path="/record-mode" element={<RecordModePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/about" element={<AboutPage />} />
              
              {/* Authentication routes */}
              <Route path="/login/success" element={<HomePage />} />
              <Route path="/login" element={<HomePage />} />
              
              {/* Test route */}
              <Route path="/test" element={<TestPage />} />
              
              {/* 404 fallback route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          
          <footer className="footer">
            <div className="footer-content">
              <div className="footer-right">
                <ServerStatus />
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;
