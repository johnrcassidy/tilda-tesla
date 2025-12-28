import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import MainApp from './components/layout/MainApp';
import './App.css';

function AppContent() {
  const { authState } = useAuth();

  if (!authState.isAuthenticated) {
    return <LoginPage />;
  }

  return <MainApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
