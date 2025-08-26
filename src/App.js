import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import './App.css';
import { Routes, Route,  Navigate, useLocation, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QuizList from './components/Quizz/QuizList';
import QuizCreate from './components/Quizz/QuizCreate';
import QuizTake from './components/Quizz/QuizTake';
import QuizResult from './components/Quizz/QuizResult';
import Home from './components/Single/Home';
import Profile from './components/Profiles/Profile';
import Friends from './components/Profiles/Friends';
import FriendsProfile from './components/Profiles/FriendsProfile';
import TeacherDashboard from './components/Dashboards/TeacherDashboard';
import StudentDashboard from './components/Dashboards/StudentDashboard';
import ClassroomDetails from './components/Dashboards/ClassroomDetails';
import StudentClassroom from './components/Dashboards/StudentClassroom';
import Leaderboard from './components/Profiles/Leaderboard';
import './components/Mode.css';
import Header from './components/AllPages/Header';
import Footer from './components/AllPages/Footer';
import AIMiniBot from './components/AllPages/AIMiniBot';
import axios from 'axios';
import { ChatProvider } from './components/Chat/ChatContext';
import ChatSlider from './components/Chat/ChatSlider';
import './components/AllPages/OrientationMessage.css';

axios.defaults.withCredentials = true; // Send cookies with all requests
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/profile');
      setUserProfile(res.data);
      setIsLoggedIn(true); // Set isLoggedIn to true on successful fetch
    } catch (error) {
      console.error('Failed to fetch user profile in App.js', error);
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  const fetchFriendRequestCount = useCallback(async () => { // Wrapped in useCallback
    if (isLoggedIn) {
      try {
        const res = await axios.get('http://localhost:5000/api/friends/requests');
        setFriendRequestCount(res.data.length);
      } catch (error) {
        console.error('Failed to fetch friend request count', error);
        setFriendRequestCount(0);
      }
    }
  }, [isLoggedIn]); // Dependency for useCallback: isLoggedIn

  useEffect(() => {
    fetchUserProfile(); // Call on component mount
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    fetchFriendRequestCount();
  }, [isLoggedIn, fetchFriendRequestCount]); // Added fetchFriendRequestCount to dependencies

  const isQuizCreateOrEditPage = location.pathname === '/quiz/create' || location.pathname.startsWith('/quiz/edit/');
  const mainClassName = isQuizCreateOrEditPage ? 'full-width-main' : 'container';
  const isQuizTakePage = location.pathname.startsWith('/quiz/take/') || location.pathname.startsWith('/classroom/') || location.pathname.startsWith('/teacher/classroom/');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await fetchUserProfile();
      setIsLoading(false);
    };
    init();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }
  return (
    <div className='App'>
      <ChatProvider isLoggedIn={isLoggedIn} userProfile={userProfile}> {/* Wrap with ChatProvider */}
      <ToastContainer position="bottom-left" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} userProfile={userProfile} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} friendRequestCount={friendRequestCount} />

      <main className={mainClassName}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} setUserProfile={setUserProfile} />} />
          <Route path="/login" element={<Navigate to="/home" />} /> {/* Redirect to home */}
          <Route path="/register" element={<Navigate to="/home" />} /> {/* Redirect to home */}
          <Route path="/quizzes" element={<QuizList userProfile={userProfile} />} />
          <Route path="/profile" element={<Profile key={isLoggedIn} />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/teacher/dashboard" element={userProfile && userProfile.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/login" />} />
          <Route path="/student/dashboard" element={userProfile && userProfile.role === 'student' ? <StudentDashboard /> : <Navigate to="/login" />} />
          <Route path="/teacher/classroom/:classroomId" element={userProfile && userProfile.role === 'teacher' ? <ClassroomDetails userProfile={userProfile} /> : <Navigate to="/login" />} />
          <Route path="/classroom/:classroomId" element={userProfile && userProfile.role === 'student' ? <StudentClassroom /> : <Navigate to="/login" />} />
          <Route path="/friends" element={<Friends fetchFriendRequestCount={fetchFriendRequestCount} />} />
          <Route path="/friends/:userId" element={<FriendsProfile />} />
          <Route path="/profile/:userId" element={<FriendsProfile />} />
          <Route path="/quiz/create" element={userProfile ? <QuizCreate /> : <Navigate to="/login" />} />
          <Route path="/quiz/edit/:id" element={userProfile ? <QuizCreate /> : <Navigate to="/login" />} />
          <Route path="/quiz/take/:id" element={<QuizTake />} />
          <Route path="/quiz/:id/result" element={<QuizResult />} />
          <Route element={<Outlet context={{ userProfile }} />}>
            <Route path="/quiz/create" element={<QuizCreate />} />
            <Route path="/quiz/edit/:id" element={<QuizCreate />} />
            <Route path="/quiz/take/:id" element={<QuizTake />} />
            <Route path="/quiz/:id/result" element={<QuizResult />} />
          </Route>
        </Routes>
      </main>

      {isLoggedIn && !isQuizTakePage && <AIMiniBot userProfile={userProfile} />}
      {isLoggedIn && !isQuizTakePage && <ChatSlider />}
      <Footer />
    </ChatProvider>
    {/* Removed <OrientationMessage /> component, kept the div */}
    <div className="orientation-message-overlay">
      <p>Please rotate your device for the best experience.</p>
      <span className="rotate-icon">🔄</span>
    </div>
    </div>
  );
}

export default App;