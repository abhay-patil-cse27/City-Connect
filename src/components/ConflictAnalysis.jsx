import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Calendar, Users, Target } from 'lucide-react';
import { analyzeProjectConflicts } from '../services/conflictAnalysis';

const customIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ConflictAnalysis = ({ projectId, projectData }) => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConflict, setSelectedConflict] = useState(null);

  useEffect(() => {
    const analyzeConflicts = async () => {
      try {
        setLoading(true);
        const conflictResults = await analyzeProjectConflicts(projectId, projectData);
        setConflicts(conflictResults);
      } catch (err) {
        setError(err.message);
        console.error('Error analyzing conflicts:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId && projectData) {
      analyzeConflicts();
    }
  }, [projectId, projectData]);

  const getConflictColor = (severity) => {
    const severityNum = parseFloat(severity);
    if (severityNum >= 0.9) return '#ef4444'; // red-500
    if (severityNum >= 0.7) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error analyzing conflicts: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conflict Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Conflict Analysis</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            conflicts.length > 0
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {conflicts.length} {conflicts.length === 1 ? 'Conflict' : 'Conflicts'} Found
          </span>
        </div>

        {/* Conflict List */}
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <motion.div
              key={conflict.projectId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                parseFloat(conflict.severity) >= 0.9
                  ? 'bg-red-50 border-red-200'
                  : parseFloat(conflict.severity) >= 0.7
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{conflict.projectTitle}</h3>
                  <p className="text-sm text-gray-600">{conflict.department}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  parseFloat(conflict.severity) >= 0.9
                    ? 'bg-red-100 text-red-700'
                    : parseFloat(conflict.severity) >= 0.7
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {conflict.type}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} />
                  <span>Distance: {conflict.distance} km</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} />
                  <span>{conflict.temporalConflict ? 'Temporal conflict detected' : 'No temporal conflict'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target size={14} />
                  <span>Severity: {(parseFloat(conflict.severity) * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-700">
                <strong>Recommendation:</strong> {conflict.recommendation}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Conflict Map */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Conflict Visualization</h2>
        <div className="h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={[projectData.location.lat, projectData.location.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* Current Project Marker */}
            <Marker
              position={[projectData.location.lat, projectData.location.lng]}
              icon={customIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{projectData.title}</h3>
                  <p className="text-sm text-gray-600">Current Project</p>
                </div>
              </Popup>
            </Marker>

            {/* Conflict Zones */}
            {conflicts.map((conflict) => (
              <Circle
                key={conflict.projectId}
                center={[projectData.location.lat, projectData.location.lng]}
                radius={500} // 500 meters radius
                pathOptions={{
                  color: getConflictColor(conflict.severity),
                  fillColor: getConflictColor(conflict.severity),
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default ConflictAnalysis; 