import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Language, TabType } from '../../types';
import './Header.css';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function Header({ activeTab, onTabChange }: HeaderProps) {
  const [language, setLanguage] = useState<Language>('en-GB');
  const { authState, logout } = useAuth();

  const tabs: { id: TabType; label: string }[] = [
    { id: 'video', label: 'Video Analysis' },
    { id: 'image', label: 'Image Analysis' },
    { id: 'road-learning', label: 'Road Learning' },
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">
          <img src="/infrencr.png" alt="TILDA Logo" height="40" />
        </div>
      </div>
      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="header-right">
        <div className="header-language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="lang-select"
          >
            <option value="en-US">en-US</option>
            <option value="en-GB">en-GB</option>
            <option value="fr-FR">fr-FR</option>
            <option value="de-DE">de-DE</option>
            <option value="es-ES">es-ES</option>
            <option value="it-IT">it-IT</option>
            <option value="pt-PT">pt-PT</option>
            <option value="nl-NL">nl-NL</option>
          </select>
        </div>
        <div className="header-user">
          <span className="user-email">{authState.email}</span>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;

