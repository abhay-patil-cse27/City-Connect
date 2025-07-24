import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { 
  Menu, X, User, LogOut, Building2, BarChart3, 
  Network, MessageSquare, Users2, Brain, Calendar,
  ChevronRight, Bell, Search, Settings, Sun, Moon,
  AlertTriangle, Wrench, Wallet, FileText, Users,
  IndianRupee, PieChart
} from 'lucide-react';
import Home from './components/Home';
import Projects from './components/Projects';
import Resources from './components/Resources';
import Forum from './components/Forum';
import Chat from './components/Chat';
import ProjectDetails from './components/ProjectDetails';
import AIFeatures from './components/AIFeatures';
import DocumentsDashboard from './components/documents/DocumentsDashboard';
import DepartmentManagement from './components/DepartmentManagement';
import BudgetAnalytics from './components/BudgetAnalytics';
import AIAssistant from './components/AIAssistant';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { USER_ROLES, PERMISSIONS } from './services/userService';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import UserManagement from './components/UserManagement';

const menuItems = [
  { 
    path: '/', 
    icon: Building2, 
    text: 'Dashboard',
    description: 'Overview and key metrics',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR, USER_ROLES.OFFICER, USER_ROLES.PUBLIC]
  },
  { 
    path: '/projects', 
    icon: BarChart3, 
    text: 'Projects',
    description: 'Manage and track projects',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR, USER_ROLES.OFFICER]
  },
  { 
    path: '/documents', 
    icon: FileText, 
    text: 'Documents',
    description: 'Document management system',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR, USER_ROLES.OFFICER]
  },
  { 
    path: '/resources', 
    icon: Network, 
    text: 'Resources',
    description: 'Resource allocation and tracking',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR]
  },
  { 
    path: '/departments', 
    icon: Building2, 
    text: 'Departments',
    description: 'Department management',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR]
  },
  // { 
  //   path: '/budget', 
  //   icon: IndianRupee, 
  //   text: 'Budget',
  //   description: 'Budget tracking and analytics',
  //   roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR]
  // },
  { 
    path: '/forum', 
    icon: Users2, 
    text: 'Forum',
    description: 'Department discussions',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR, USER_ROLES.OFFICER, USER_ROLES.PUBLIC]
  },
  { 
    path: '/chat', 
    icon: MessageSquare, 
    text: 'Chat',
    description: 'Real-time communication',
    roles: [USER_ROLES.SUPER_USER, USER_ROLES.SUPERVISOR, USER_ROLES.OFFICER, USER_ROLES.PUBLIC]
  }
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const { userRole } = useAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <p className="text-white text-lg font-medium">Loading CityConnect...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-900' : 'bg-slate-100'}`}>
      {user ? (
        <div className="flex h-screen">
          {/* Sidebar */}
          <motion.div
            initial={false}
            animate={{ width: isMenuOpen ? '320px' : '80px' }}
            className="bg-white dark:bg-slate-800 shadow-lg z-20 relative border-r border-slate-200 dark:border-slate-700"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <motion.div
                animate={{ opacity: isMenuOpen ? 1 : 0}}
                className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
              >
                CityConnect
              </motion.div>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {isMenuOpen ? <X size={15} /> : <Menu size={24} />}
              </button>
            </div>

            <nav className="mt-6 px-2">
              {filteredMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 my-1 rounded-xl transition-all duration-200 group ${
                    location.pathname === item.path
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <item.icon size={24} className={`transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} />
                  <motion.div
                    animate={{ opacity: isMenuOpen ? 1 : 0 }}
                    className="ml-4 overflow-hidden"     
                  >
                    <div className="font-medium">{item.text}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {item.description}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    animate={{ opacity: isMenuOpen ? 0 : 1 }}
                  
                    >
                     <div className=""></div>

                      <item.icon size={24} className={`transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-indigo-900 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} />

                    </motion.div>

                  {!isMenuOpen && location.pathname === item.path && (
                    <div className="w-1 h-8 bg-indigo-600 dark:bg-indigo-400 absolute right-0 rounded-l-full" />
                  )}
                </Link>
              ))}
              {userRole === USER_ROLES.SUPER_USER && (
                <Link
                  to="/users"
                  className="flex items-center px-4 py-3 my-1 rounded-xl transition-all duration-200 group hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                >
                  <Users className="w-5 h-5 mr-3" />
                  <motion.div
                    animate={{ opacity: isMenuOpen ? 1 : 0 }}
                    className="ml-4 overflow-hidden"
                  >
                    <div className="font-medium">User Management</div>
                  </motion.div>
                </Link>
              )}
            </nav>
          </motion.div>
          
            

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className="bg-white dark:bg-slate-800 h-16 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 z-10">
              <div className="flex items-center flex-1 max-w-2xl">
                {/* <div className="relative flex-1 max-w-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-slate-400 dark:text-slate-500" size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search projects, resources, or departments..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div> */}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="text-yellow-500" size={24} /> : <Moon className="text-slate-700" size={24} />}
                </button>
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative"
                  title="Notifications"
                >
                  <Bell size={24} className="text-slate-700 dark:text-slate-300" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                <button 
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Settings"
                >
                  <Settings size={24} className="text-slate-700 dark:text-slate-300" />
                </button>
                <div className="h-8 mx-2 w-px bg-slate-200 dark:bg-slate-700"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>

            {/* Routes */}
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/project/:id" element={<ProjectDetails />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:id" element={<Chat />} />
                <Route path="/ai-features" element={<AIFeatures />} />
                <Route path="/documents" element={<DocumentsDashboard />} />
                <Route path="/departments" element={<DepartmentManagement />} />
                <Route path="/budget" element={<BudgetAnalytics />} />
                <Route path="/users" element={
                  <ProtectedRoute requiredRole={USER_ROLES.SUPER_USER}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
      
      {/* AI Assistant */}
      {user && <AIAssistant />}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, userRole, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole)) {
      return <Navigate to="/" />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default App;