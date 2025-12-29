import { useState } from 'react';
import './Footer.css';

function Footer() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <span>Made by John Cassidy</span>
          <span className="footer-separator">|</span>
          <a href="#" className="footer-link">Connect API</a>
        </div>
        <div className="footer-right">
          <button
            type="button"
            className="footer-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings File
          </button>
        </div>
      </div>
      {showSettings && (
        <div className="settings-file-panel">
          <h4>Settings</h4>
          <div className="settings-options">
            <div className="setting-group">
              <label>Theme:</label>
              <select className="setting-select">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Language:</label>
              <select className="setting-select">
                <option value="en-GB">English (UK)</option>
                <option value="en-US">English (US)</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
              </select>
            </div>
            <div className="setting-group">
              <label>
                <input type="checkbox" /> Enable Notifications
              </label>
            </div>
            <div className="setting-group">
              <label>
                <input type="checkbox" /> Auto-save Results
              </label>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;

