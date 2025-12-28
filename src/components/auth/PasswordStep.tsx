import { useState } from 'react';

interface PasswordStepProps {
  email: string;
  onSubmit: (password: string) => void;
  onBack: () => void;
}

function PasswordStep({ email, onSubmit, onBack }: PasswordStepProps) {
  const [password, setPassword] = useState('');

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
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
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
        <button type="button" className="btn-secondary">
          Create Account
        </button>
      </form>
    </div>
  );
}

export default PasswordStep;

