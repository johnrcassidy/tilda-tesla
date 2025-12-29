import { useState } from 'react';

interface PasswordStepProps {
  email: string;
  onSubmit: (password: string) => void;
  onBack: () => void;
  onCreateAccount: () => void;
}

function PasswordStep({ email, onSubmit, onBack, onCreateAccount }: PasswordStepProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onSubmit(password);
    }
  };

  return (
    <div className="login-step">
      <h2>Sign In</h2>
      <div className="email-display">
        <span>{email}</span>
        <button type="button" onClick={onBack} className="btn-link">
          Change
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="button-group">
          <button type="submit" className="btn-primary">
            Sign In
          </button>
          <button type="button" onClick={onBack} className="btn-secondary">
            Cancel
          </button>
        </div>
        <div className="login-links">
          <a href="#">Forgot password?</a>
        </div>
        <div className="separator">Or</div>
        <button type="button" className="btn-secondary" onClick={onCreateAccount}>
          Create Account
        </button>
      </form>
    </div>
  );
}

export default PasswordStep;

