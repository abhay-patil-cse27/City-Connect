import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, MapPin, Building2, UserCircle, Loader2, UserCog, Calendar, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from "@/components/ui/alert";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        fetchProfile(user.uid);
      } else {
        navigate('/login');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const fetchProfile = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        const newProfile = {
          name: '',
          department: '',
          role: '',
          bio: '',
          location: '',
          imageUrl: '/api/placeholder/150/150',
          joined: new Date().toISOString()
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      showNotification('Error fetching profile', 'error');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const storageRef = ref(storage, `profile-images/${user.uid}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', user.uid), {
        ...profile,
        imageUrl
      });
      
      setProfile(prev => ({ ...prev, imageUrl }));
      showNotification('Profile image updated successfully!', 'success');
    } catch (error) {
      showNotification('Failed to upload image', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', user.uid), profile);
      showNotification('Profile updated successfully!', 'success');
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  if (!user) return null;
  if (!profile) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="container mx-auto max-w-4xl">
        <AnimatePresence>
          {notification.show && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <Alert className={`${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'} shadow-lg`}>
                <AlertDescription>{notification.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="w-8 h-8 text-indigo-600" />
              Profile Settings
            </h2>
            <div className="text-gray-600 text-sm">
              {user.email}
            </div>
          </div>

          {/* Profile Content */}
          <div className="bg-white rounded-xl">
            {/* Profile Image */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <img
                    src={profile.imageUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full border-4 border-indigo-100 shadow-lg object-cover"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 transition-colors shadow-lg"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </motion.div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Full Name</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-slate-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3
                             border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 
                             outline-none transition-all duration-300"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Department</label>
                  <select
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    className="w-full bg-slate-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3
                             border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 
                             outline-none transition-all duration-300"
                  >
                    <option value="">Select Department</option>
                    <option value="water">Water Department</option>
                    <option value="roads">Roads & Infrastructure</option>
                    <option value="power">Power & Energy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Role</label>
                  <input
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    className="w-full bg-slate-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3
                             border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 
                             outline-none transition-all duration-300"
                    placeholder="Enter your role"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="w-full bg-slate-50 text-gray-900 placeholder-gray-400 rounded-xl pl-12 px-4 py-3
                               border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 
                               outline-none transition-all duration-300"
                      placeholder="Enter your location"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-slate-50 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3
                             border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 
                             outline-none transition-all duration-300 h-32 resize-none"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 flex justify-end relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={updateProfile}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl 
                         hover:bg-indigo-700 transition-all duration-300 disabled:opacity-50 
                         disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                Save Changes
              </motion.button>
            </div>

            {/* Join Date */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar className="h-4 w-4" />
                Joined {new Date(profile.joined).toLocaleDateString()}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;