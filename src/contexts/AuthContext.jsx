import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db 
} from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { USER_ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user role and permissions from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserPermissions(ROLE_PERMISSIONS[userData.role] || []);
        }
        setUser(user);
      } else {
        setUser(null);
        setUserRole(null);
        setUserPermissions([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, name, role = USER_ROLES.PUBLIC) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        name,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update profile
      await updateProfile(user, { displayName: name });

      return user;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const hasPermission = (permission) => {
    return userPermissions.includes(permission);
  };

  const isSuperUser = () => {
    return userRole === USER_ROLES.SUPER_USER;
  };

  const isSupervisor = () => {
    return userRole === USER_ROLES.SUPERVISOR;
  };

  const isOfficer = () => {
    return userRole === USER_ROLES.OFFICER;
  };

  const isPublic = () => {
    return userRole === USER_ROLES.PUBLIC;
  };

  const value = {
    user,
    userRole,
    userPermissions,
    loading,
    signup,
    login,
    logout,
    hasPermission,
    isSuperUser,
    isSupervisor,
    isOfficer,
    isPublic
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 