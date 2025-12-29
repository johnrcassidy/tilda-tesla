import { useState } from 'react';

interface EmailStepProps {
  onNext: (email: string) => void;
  onCreateAccount: () => void;
}

function EmailStep({ onNext, onCreateAccount }: EmailStepProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      onNext(email);
    }
  };

  return (
    <div className="login-step">
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="button-group">
          <button type="submit" className="btn-primary">
            Next
          </button>
          <button type="button" className="btn-secondary">
            Cancel
          </button>
        </div>
        <div className="login-links">
          <a href="#">Trouble Signing In?</a>
        </div>
        <div className="separator">Or</div>
        <button type="button" className="btn-secondary" onClick={onCreateAccount}>
          Create Account
        </button>
      </form>
    </div>
  );
}

export default EmailStep;

