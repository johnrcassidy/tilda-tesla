import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Language } from '../../types';
import EmailStep from './EmailStep';
import PasswordStep from './PasswordStep';
import MFAStep from './MFAStep';
import './LoginPage.css';

function LoginPage() {
  const { authState, setLoginStep } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<Language>('en-GB');

  const handleEmailNext = (emailValue: string) => {
    setEmail(emailValue);
    setError('');
    setLoginStep('password');
  };

  const handlePasswordSubmit = (passwordValue: string) => {
    if (passwordValue.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setPassword(passwordValue);
    setError('');
    setLoginStep('mfa');
  };

  const { login } = useAuth();
  
  const handleMFASubmit = async (code: string) => {
    setError('');
    const success = await login({ email, password, mfaCode: code });
    if (!success) {
      setError('Invalid credentials. Please check your email, password (min 8 characters), and MFA code (6 digits).');
    }
  };

  const handleBackToEmail = () => {
    setLoginStep('email');
    setPassword('');
    setError('');
  };

  const handleCreateAccount = () => {
    // Reset to email step and clear any errors
    setLoginStep('email');
    setEmail('');
    setPassword('');
    setError('');
    // TODO: Implement account creation flow
    alert('Account creation not yet implemented');
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="login-logo">
          <img src="/infrencr.png" alt="TILDA" height="30" />
        </div>
        <div className="login-lang">
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
      </div>

      <div className="login-form-container">
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}
        {authState.loginStep === 'email' && (
          <EmailStep onNext={handleEmailNext} onCreateAccount={handleCreateAccount} />
        )}
        {authState.loginStep === 'password' && (
          <PasswordStep
            email={email}
            onSubmit={handlePasswordSubmit}
            onBack={handleBackToEmail}
            onCreateAccount={handleCreateAccount}
          />
        )}
        {authState.loginStep === 'mfa' && (
          <MFAStep
            onSubmit={handleMFASubmit}
            onBack={handleBackToEmail}
          />
        )}
      </div>
    </div>
  );
}

export default LoginPage;

