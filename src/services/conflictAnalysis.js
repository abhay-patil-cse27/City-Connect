import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Calculate distance between two points using the Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if two date ranges overlap
const dateRangesOverlap = (start1, end1, start2, end2) => {
  return start1 <= end2 && start2 <= end1;
};

// Analyze potential conflicts between projects
export const analyzeProjectConflicts = async (projectId, projectData) => {
  try {
    // Get all active projects
    const projectsRef = collection(db, 'projects');
    const projectsQuery = query(projectsRef, where('status', '==', 'active'));
    const projectsSnapshot = await getDocs(projectsQuery);
    
    const conflicts = [];
    const currentProject = {
      ...projectData,
      id: projectId
    };

    // Analyze each project for potential conflicts
    for (const doc of projectsSnapshot.docs) {
      const otherProject = {
        id: doc.id,
        ...doc.data()
      };

      // Skip if it's the same project
      if (otherProject.id === projectId) continue;

      // Calculate distance between projects
      const distance = calculateDistance(
        currentProject.location.lat,
        currentProject.location.lng,
        otherProject.location.lat,
        otherProject.location.lng
      );

      // Check for temporal conflicts
      const temporalConflict = dateRangesOverlap(
        new Date(currentProject.startDate),
        new Date(currentProject.endDate),
        new Date(otherProject.startDate),
        new Date(otherProject.endDate)
      );

      // Define conflict thresholds
      const DISTANCE_THRESHOLD = 0.5; // 500 meters
      const SEVERITY_THRESHOLD = 0.7; // 70% overlap

      // Calculate conflict severity
      let severity = 0;
      if (distance < DISTANCE_THRESHOLD) {
        severity += 0.5; // High spatial conflict
      }
      if (temporalConflict) {
        severity += 0.5; // High temporal conflict
      }

      // If there's a significant conflict
      if (severity >= SEVERITY_THRESHOLD) {
        conflicts.push({
          projectId: otherProject.id,
          projectTitle: otherProject.title,
          department: otherProject.department,
          distance: distance.toFixed(2),
          temporalConflict,
          severity: severity.toFixed(2),
          type: distance < DISTANCE_THRESHOLD && temporalConflict ? 'spatial-temporal' :
                distance < DISTANCE_THRESHOLD ? 'spatial' : 'temporal',
          recommendation: generateConflictRecommendation(severity, distance, temporalConflict)
        });
      }
    }

    return conflicts;
  } catch (error) {
    console.error('Error analyzing project conflicts:', error);
    throw error;
  }
};

// Generate recommendations based on conflict analysis
const generateConflictRecommendation = (severity, distance, temporalConflict) => {
  if (severity >= 0.9) {
    return 'High risk: Consider rescheduling or relocating the project to avoid conflicts.';
  } else if (severity >= 0.7) {
    return 'Medium risk: Coordinate closely with the conflicting project team and establish clear boundaries.';
  } else {
    return 'Low risk: Monitor the situation and maintain regular communication with the other project team.';
  }
};

// Analyze resource conflicts
export const analyzeResourceConflicts = async (projectId, resourceId, startDate, endDate) => {
  try {
    const tasksRef = collection(db, `projects/${projectId}/tasks`);
    const tasksQuery = query(
      tasksRef,
      where('resourceId', '==', resourceId),
      where('status', 'in', ['todo', 'inProgress'])
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const conflicts = [];

    for (const doc of tasksSnapshot.docs) {
      const task = doc.data();
      
      if (dateRangesOverlap(startDate, endDate, task.startDate, task.dueDate)) {
        conflicts.push({
          taskId: doc.id,
          taskTitle: task.title,
          startDate: task.startDate,
          endDate: task.dueDate,
          severity: calculateResourceConflictSeverity(startDate, endDate, task.startDate, task.dueDate)
        });
      }
    }

    return conflicts;
  } catch (error) {
    console.error('Error analyzing resource conflicts:', error);
    throw error;
  }
};

// Calculate resource conflict severity
const calculateResourceConflictSeverity = (start1, end1, start2, end2) => {
  const overlap = Math.min(new Date(end1), new Date(end2)) - Math.max(new Date(start1), new Date(start2));
  const totalDuration = Math.max(new Date(end1), new Date(end2)) - Math.min(new Date(start1), new Date(start2));
  return (overlap / totalDuration) * 100;
}; 