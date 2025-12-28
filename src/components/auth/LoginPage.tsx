import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import EmailStep from './EmailStep';
import PasswordStep from './PasswordStep';
import MFAStep from './MFAStep';
import './LoginPage.css';

function LoginPage() {
  const { authState, setLoginStep } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleEmailNext = (emailValue: string) => {
    setEmail(emailValue);
    setLoginStep('password');
  };

  const handlePasswordSubmit = (passwordValue: string) => {
    setPassword(passwordValue);
    setLoginStep('mfa');
  };

  const { login } = useAuth();
  
  const handleMFASubmit = async (code: string) => {
    setMfaCode(code);
    await login({ email, password, mfaCode: code });
  };

  const handleBackToEmail = () => {
    setLoginStep('email');
    setPassword('');
    setMfaCode('');
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="login-logo">
          <img src="/infrencr.png" alt="TILDA" height="30" />
        </div>
        <div className="login-lang">
          <select>
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
        {authState.loginStep === 'email' && (
          <EmailStep onNext={handleEmailNext} />
        )}
        {authState.loginStep === 'password' && (
          <PasswordStep
            email={email}
            onSubmit={handlePasswordSubmit}
            onBack={handleBackToEmail}
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

