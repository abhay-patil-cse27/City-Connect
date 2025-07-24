import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { MapPin, Users, FileText, Wrench, Building, Calendar, ChevronRight, 
         MessageCircle, Sparkles, Search, Filter, Star, Clock, BookOpen,
         PlusCircle, X, Check, AlertTriangle, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Training = () => {
  const [trainings, setTrainings] = useState([]);
  const [filteredTrainings, setFilteredTrainings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const formRef = useRef(null);
  const [activeNotification, setActiveNotification] = useState(null);
  const [enrolledTrainings, setEnrolledTrainings] = useState([]);
  
  const [newTraining, setNewTraining] = useState({
    title: '',
    description: '',
    date: '',
    department: '',
    type: '',
    capacity: '',
    location: '',
    instructor: '',
    prerequisites: [],
    duration: '',
    status: 'upcoming',
    registeredParticipants: 0,
    materials: [],
    difficulty: 'beginner',
    tags: [],
    rating: 0,
    reviews: []
  });

  useEffect(() => {
    const filtered = trainings.filter(training => {
      const matchesSearch = training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          training.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || training.type === filterType;
      return matchesSearch && matchesFilter;
    });
    setFilteredTrainings(filtered);
  }, [searchTerm, filterType, trainings]);

  const addTraining = async () => {
    try {
      await addDoc(collection(db, 'trainings'), {
        ...newTraining,
        created: new Date(),
        registeredParticipants: 0,
        status: 'upcoming'
      });
      showNotification('Training session created successfully!', 'success');
      setShowForm(false);
      resetForm();
    } catch (e) {
      showNotification('Error creating training session', 'error');
      console.error(e);
    }
  };

  const enrollInTraining = async (trainingId) => {
    if (enrolledTrainings.includes(trainingId)) {
      showNotification('You are already enrolled in this training!', 'warning');
      return;
    }
    
    try {
      const trainingRef = doc(db, 'trainings', trainingId);
      const training = trainings.find(t => t.id === trainingId);
      
      if (training.registeredParticipants >= training.capacity) {
        showNotification('This training session is full!', 'error');
        return;
      }

      await updateDoc(trainingRef, {
        registeredParticipants: training.registeredParticipants + 1
      });
      
      setEnrolledTrainings([...enrolledTrainings, trainingId]);
      showNotification('Successfully enrolled in training!', 'success');
    } catch (e) {
      showNotification('Error enrolling in training', 'error');
      console.error(e);
    }
  };

  const submitReview = async (trainingId, rating, comment) => {
    try {
      const trainingRef = doc(db, 'trainings', trainingId);
      const training = trainings.find(t => t.id === trainingId);
      
      const newReview = {
        rating,
        comment,
        user: user.email,
        date: new Date()
      };

      const updatedReviews = [...training.reviews, newReview];
      const averageRating = updatedReviews.reduce((acc, rev) => acc + rev.rating, 0) / updatedReviews.length;

      await updateDoc(trainingRef, {
        reviews: updatedReviews,
        rating: averageRating
      });

      showNotification('Review submitted successfully!', 'success');
    } catch (e) {
      showNotification('Error submitting review', 'error');
      console.error(e);
    }
  };

  const showNotification = (message, type) => {
    setActiveNotification({ message, type });
    setTimeout(() => setActiveNotification(null), 3000);
  };

  const resetForm = () => {
    setNewTraining({
      title: '',
      description: '',
      date: '',
      department: '',
      type: '',
      capacity: '',
      location: '',
      instructor: '',
      prerequisites: [],
      duration: '',
      status: 'upcoming',
      registeredParticipants: 0,
      materials: [],
      difficulty: 'beginner',
      tags: [],
      rating: 0,
      reviews: []
    });
  };

  useEffect(() => {
    const q = query(collection(db, 'trainings'), orderBy('date', 'asc'));
    return onSnapshot(q, snap =>
      setTrainings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400';
      case 'intermediate': return 'text-yellow-400';
      case 'advanced': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-6 shadow-2xl border border-emerald-500/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              Training Portal
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl transition-all duration-300"
            >
              {showForm ? <X className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              {showForm ? 'Close Form' : 'Add Training'}
            </motion.button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300/50" />
              <input
                type="text"
                placeholder="Search trainings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/40 text-emerald-50 placeholder-emerald-300/50 rounded-xl px-4 py-3 pl-12
                         border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                         outline-none transition-all duration-300"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900/40 text-emerald-50 rounded-xl px-4 py-3
                       border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                       outline-none transition-all duration-300"
            >
              <option value="all">All Types</option>
              <option value="technical">Technical</option>
              <option value="safety">Safety</option>
              <option value="compliance">Compliance</option>
              <option value="soft-skills">Soft Skills</option>
              <option value="leadership">Leadership</option>
            </select>
          </div>

          {/* Add Training Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-slate-900/40 rounded-xl p-6 border border-emerald-500/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Training Title"
                      value={newTraining.title}
                      onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
                      className="bg-slate-800/40 text-emerald-50 placeholder-emerald-300/50 rounded-xl px-4 py-3
                               border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                               outline-none transition-all duration-300"
                    />
                    <input
                      type="datetime-local"
                      value={newTraining.date}
                      onChange={(e) => setNewTraining({ ...newTraining, date: e.target.value })}
                      className="bg-slate-800/40 text-emerald-50 placeholder-emerald-300/50 rounded-xl px-4 py-3
                               border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                               outline-none transition-all duration-300"
                    />
                    <textarea
                      placeholder="Description"
                      value={newTraining.description}
                      onChange={(e) => setNewTraining({ ...newTraining, description: e.target.value })}
                      className="md:col-span-2 bg-slate-800/40 text-emerald-50 placeholder-emerald-300/50 rounded-xl px-4 py-3
                               border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                               outline-none transition-all duration-300"
                      rows="4"
                    />
                    <select
                      value={newTraining.department}
                      onChange={(e) => setNewTraining({ ...newTraining, department: e.target.value })}
                      className="bg-slate-800/40 text-emerald-50 rounded-xl px-4 py-3
                               border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                               outline-none transition-all duration-300"
                    >
                      <option value="">Select Department</option>
                      <option value="water">Water Department</option>
                      <option value="roads">Roads & Infrastructure</option>
                      <option value="power">Power & Energy</option>
                      <option value="all">All Departments</option>
                    </select>
                    <select
                      value={newTraining.type}
                      onChange={(e) => setNewTraining({ ...newTraining, type: e.target.value })}
                      className="bg-slate-800/40 text-emerald-50 rounded-xl px-4 py-3
                               border border-emerald-500/20 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 
                               outline-none transition-all duration-300"
                    >
                      <option value="">Select Training Type</option>
                      <option value="technical">Technical</option>
                      <option value="safety">Safety</option>
                      <option value="compliance">Compliance</option>
                      <option value="soft-skills">Soft Skills</option>
                      <option value="leadership">Leadership</option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addTraining}
                      className="md:col-span-2 bg-emerald-500 text-white px-4 py-3 rounded-xl
                               hover:bg-emerald-400 transition-all duration-300"
                    >
                      Create Training
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Training Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredTrainings.map((training) => (
                <motion.div
                  key={training.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-slate-900/40 rounded-xl p-6 border border-emerald-500/20 backdrop-blur-lg
                           hover:border-emerald-400/50 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-emerald-300">{training.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      training.status === 'upcoming'
                        ? 'bg-blue-500/20 text-blue-300'
                        : training.status === 'in-progress'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {training.status}
                    </span>
                  </div>

                  <p className="text-emerald-50/70 mb-4">{training.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-emerald-300/70">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(training.date).toLocaleString()}
                    </div>
                    <div className="flex items-center text-emerald-300/70">
                      <MapPin className="w-4 h-4 mr-2" />
                      {training.location}
                    </div>
                    <div className="flex items-center text-emerald-300/70">
                      <Users className="w-4 h-4 mr-2" />
                      {training.registeredParticipants} / {training.capacity} participants
                    </div>
                    <div className="flex items-center text-emerald-300/70">
                      <Clock className="w-4 h-4 mr-2" />
                      {training.duration} hours
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm">
                      {training.department}
                    </span>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm">
                      {training.type}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-sm ${getDifficultyColor(training.difficulty)} bg-slate-800/40`}>
                      {training.difficulty}
                    </span>
                  </div>

                  {training.prerequisites?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-emerald-300/70 mb-2">Prerequisites:</p>
                  <div className="flex flex-wrap gap-2">
                    {training.prerequisites.map(prereq => (
                      <span
                        key={prereq}
                        className="px-2 py-1 bg-slate-800/40 text-emerald-200/70 rounded-lg text-sm"
                      >
                        {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-emerald-300/70">
                      <Award className="w-4 h-4 mr-2" />
                      <span className="text-sm">Instructor: {training.instructor}</span>
                    </div>
                    {training.rating > 0 && (
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(training.rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => enrollInTraining(training.id)}
                  disabled={enrolledTrainings.includes(training.id) || 
                           training.registeredParticipants >= training.capacity}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                            ${enrolledTrainings.includes(training.id)
                              ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                              : training.registeredParticipants >= training.capacity
                              ? 'bg-red-500/20 text-red-300 cursor-not-allowed'
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                >
                  {enrolledTrainings.includes(training.id)
                    ? 'Enrolled'
                    : training.registeredParticipants >= training.capacity
                    ? 'Full'
                    : 'Enroll Now'}
                </motion.button>
                {/* Materials button with null check */}
                {training.materials?.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300
                             hover:bg-blue-500/30 transition-all duration-300"
                  >
                    <FileText className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

          {/* Notification */}
          <AnimatePresence>
            {activeNotification && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg backdrop-blur-lg
                          ${activeNotification.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/20' :
                            activeNotification.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/20' :
                            'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20'}`}
              >
                <div className="flex items-center gap-2">
                  {activeNotification.type === 'success' ? <Check className="w-5 h-5" /> :
                   activeNotification.type === 'error' ? <X className="w-5 h-5" /> :
                   <AlertTriangle className="w-5 h-5" />}
                  {activeNotification.message}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Background Effects */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-emerald-500/5 rounded-full blur-3xl"
                style={{
                  width: Math.random() * 400 + 200,
                  height: Math.random() * 400 + 200,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                  x: [0, Math.random() * 200 - 100],
                  y: [0, Math.random() * 200 - 100],
                }}
                transition={{
                  duration: Math.random() * 10 + 10,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.4);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.6);
        }
      `}</style>
    </div>
  );
};

export default Training;