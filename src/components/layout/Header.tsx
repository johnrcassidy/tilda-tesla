import { useState } from 'react';
import { Language } from '../../types';
import './Header.css';

function Header() {
  const [language, setLanguage] = useState<Language>('en-US');

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-title">
          <h1>Tesla Inferencer Lazy Dashcam Analyser (TILDA)</h1>
          <p>Local Version (GPU/CPU)</p>
        </div>
        <div className="header-logo">
          <img src="/infrencr.png" alt="TILDA Logo" height="40" />
        </div>
      </div>
      <div className="header-language">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
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
    </header>
  );
}

export default Header;

