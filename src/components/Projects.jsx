import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChevronDown, Plus, Search, Calendar, MapPin, Building2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const customIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ProjectCard = ({ project }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl border border-slate-200 dark:border-slate-700 transition-all duration-300"
  >
    <Link to={`/project/${project.id}`} className="block">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
            {project.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
            {project.description}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          new Date(project.endDate) < new Date()
            ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
        }`}>
          {new Date(project.endDate) < new Date() ? 'Overdue' : 'Active'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Building2 size={16} className="text-gray-400 dark:text-gray-500" />
          <span>{project.department}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Calendar size={16} className="text-gray-400 dark:text-gray-500" />
          <span>{new Date(project.startDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <MapPin size={16} className="text-gray-400 dark:text-gray-500" />
          <span>
            {project.location.lat.toFixed(2)}, {project.location.lng.toFixed(2)}
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    department: '',
    startDate: '',
    endDate: '',
    location: { lat: 0, lng: 0 }
  });
  const [user, setUser] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const addProject = async () => {
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        created: new Date(),
        creatorId: user.uid,
        creatorName: user.displayName || user.email
      });
      setNewProject({
        title: '',
        description: '',
        department: '',
        startDate: '',
        endDate: '',
        location: { lat: 0, lng: 0 }
      });
      setFormVisible(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('created', 'desc'));
    return onSnapshot(q, snap => setProjects(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))));
  }, []);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const LocationMarker = () => {
    const map = useMap();

    useEffect(() => {
      if (newProject.location.lat !== 0) {
        const marker = L.marker([newProject.location.lat, newProject.location.lng], { icon: customIcon }).addTo(map);
        marker.bindPopup("New project location");
      }
    }, [newProject.location, map]);

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl"
            style={{
              width: Math.random() * 300 + 100,
              height: Math.random() * 300 + 100,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
            }}
            transition={{
              duration: Math.random() * 10 + 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-12 relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Manage and track all your urban development projects in one place
          </p>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500 transition-all"
                  placeholder="Search projects..."
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormVisible(!formVisible)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:shadow-indigo-500/25"
              >
                <Plus size={20} />
                New Project
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* New Project Form */}
        <AnimatePresence>
          {formVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Create New Project</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Project Title</label>
                      <input
                        type="text"
                        placeholder="Enter project title"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Description</label>
                      <textarea
                        placeholder="Enter project description"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500 h-32"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Department</label>
                      <input
                        type="text"
                        placeholder="Enter department name"
                        value={newProject.department}
                        onChange={(e) => setNewProject({ ...newProject, department: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Start Date</label>
                      <input
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">End Date</label>
                      <input
                        type="date"
                        value={newProject.endDate}
                        onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Latitude</label>
                        <input
                          type="number"
                          value={newProject.location.lat}
                          onChange={(e) => setNewProject({ ...newProject, location: { ...newProject.location, lat: parseFloat(e.target.value) } })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Longitude</label>
                        <input
                          type="number"
                          value={newProject.location.lng}
                          onChange={(e) => setNewProject({ ...newProject, location: { ...newProject.location, lng: parseFloat(e.target.value) } })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-gray-900 dark:text-gray-100 border border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-indigo-400 dark:focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormVisible(false)}
                    className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addProject}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:shadow-indigo-500/25"
                  >
                    Create Project
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Section */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-12 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
        >
          <div className="h-[400px] rounded-xl overflow-hidden">
            <MapContainer
              center={[16.71, 74.2]}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {projects.map(project => (
                <Marker
                  key={project.id}
                  position={[project.location.lat, project.location.lng]}
                  icon={customIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{project.title}</h3>
                      <p className="text-sm text-gray-600">{project.department}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
              <LocationMarker />
            </MapContainer>
          </div>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Projects;