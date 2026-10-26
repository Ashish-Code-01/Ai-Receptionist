import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage/landingpage';
import LoginPage from './pages/auth/loginpage';
import SignupPage from './pages/auth/signupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/Dashboard/dashboardPage';
import DetailsPage from './pages/auth/detailsPage';
import PublicQueuePage from './pages/Queue/PublicQueuePage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage onForgotPassword={() => window.location.assign('/forgot-password')} />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/details" element={<DetailsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/queue/:businessId" element={<PublicQueuePage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
