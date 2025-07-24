import React, { useState, useEffect } from 'react';
import { analyzeProjectData } from '../../lib/gemini';

export default function TaskPrioritization({ tasks, dependencies }) {
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const projectData = {
        tasks,
        dependencies,
        currentDate: new Date().toISOString()
      };

      const result = await analyzeProjectData(projectData);
      setAnalysis(result);

      // Parse and sort tasks based on AI recommendations
      const sortedTasks = [...tasks].sort((a, b) => {
        const aUrgency = calculateUrgency(a);
        const bUrgency = calculateUrgency(b);
        return bUrgency - aUrgency;
      });

      setPrioritizedTasks(sortedTasks);
    } catch (err) {
      setError('Failed to analyze tasks. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateUrgency = (task) => {
    let urgency = 0;
    
    // Consider deadline proximity
    const daysUntilDeadline = Math.ceil(
      (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );
    urgency += Math.max(10 - daysUntilDeadline, 0);

    // Consider dependencies
    const dependencyCount = dependencies.filter(d => d.targetId === task.id).length;
    urgency += dependencyCount * 2;

    // Consider priority level set by user
    urgency += task.priority * 3;

    return urgency;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">AI Task Prioritization</h2>

      <button
        onClick={analyzeTasks}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Analyzing...' : 'Analyze Tasks'}
      </button>

      {error && (
        <div className="mt-4 text-red-600 mb-4">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap">{analysis}</pre>
          </div>
        </div>
      )}

      {prioritizedTasks.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-2">Prioritized Tasks</h3>
          <div className="space-y-2">
            {prioritizedTasks.map((task) => (
              <div
                key={task.id}
                className="border p-4 rounded-md hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{task.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    calculateUrgency(task) > 10 ? 'bg-red-100 text-red-800' :
                    calculateUrgency(task) > 5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Urgency: {calculateUrgency(task)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-1">
                  Deadline: {new Date(task.deadline).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 