import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, ChartBar, Clock, Users, FileText, Zap, Sparkles, AlertTriangle, 
  CheckCircle, X, Download, History, Share2, MessageSquare, Target, 
  TrendingUp, Settings, Lightbulb, BarChart2
} from 'lucide-react';
import {
  generateProjectInsights,
  analyzeMilestones,
  generateMeetingSummary,
  analyzeResourceAllocation,
  generateStatusReport
} from '../lib/huggingface';

const AIFeatures = ({ projectData }) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [insightHistory, setInsightHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    detailLevel: 'balanced',
    focusAreas: ['performance', 'risks', 'opportunities'],
    updateFrequency: 'weekly'
  });
  const [showSettings, setShowSettings] = useState(false);

  const features = [
    {
      id: 'insights',
      name: 'Project Insights',
      icon: Brain,
      description: 'AI-powered analysis of project progress and recommendations',
      action: async () => {
        const insights = await generateProjectInsights(
          'Analyze current project status and provide strategic recommendations',
          {
            name: projectData?.name || 'Current Project',
            department: projectData?.department || 'All Departments',
            teamMembers: projectData?.teamMembers || []
          }
        );
        
      const extractInsights = (insights) => {
        // Find the starting point of the insights in the context
        const startIndex = insights.indexOf("1. ");
        
        if (startIndex === -1) return []; // Return empty array if no insights are found
      
        // Extract only the insights section
        const insightsSection = insights.substring(startIndex);

        return insightsSection
      };
      const extractedInsights = extractInsights(insights);
  

        return extractedInsights;
      }
    },
    {
      id: 'milestones',
      name: 'Milestone Analysis',
      icon: ChartBar,
      description: 'Critical path analysis and milestone optimization',
      action: async () => {
        const analysis = await analyzeMilestones(projectData?.milestones || []);


        // const extractAnalysis = (analysis) => {
        //   // Find the starting point of the insights in the context
        //   const startIndex = analysis.indexOf("Milestones and Strategic Insights: 1. Project Proposal Submission:");
          
        //   if (startIndex === -1) return []; // Return empty array if no insights are found
        
        //   // Extract only the insights section
        //   const analysisSection = analysis.substring(startIndex);
  
        //   return analysisSection
        // };
        // const extractedanalysis = extractAnalysis(analysis);
    
        // return extractedanalysis;


        return analysis;
      }
    },
    {
      id: 'meetings',
      name: 'Meeting Insights',
      icon: Users,
      description: 'Smart summaries and action items from meetings',
      action: async () => {
        const summary = await generateMeetingSummary(
          projectData?.meetingNotes || '',
          {
            name: projectData?.name || 'Current Project',
            participants: projectData?.participants || [],
            phase: projectData?.phase || 'Planning'
          }
        );


        

        
        const extractSummary = (summary) => {
          // Find the starting point of the insights in the context
          const startIndex = summary.indexOf("1. Project Scope");
          
          if (startIndex === -1) return []; // Return empty array if no insights are found
        
          // Extract only the insights section
          const summarySection = summary.substring(startIndex);
  
          return summarySection
        };
        const extractedSummary = extractSummary(summary);
    
          return extractedSummary;
    

         // return summary;
      }
    },
    {
      id: 'resources',
      name: 'Resource Optimization',
      icon: Clock,
      description: 'AI-driven resource allocation suggestions',
      action: async () => {
        const optimization = await analyzeResourceAllocation(projectData?.resources || {});
        return optimization;
      }
    },
    {
      id: 'status',
      name: 'Status Report',
      icon: FileText,
      description: 'Automated comprehensive project status reports',
      action: async () => {
        const report = await generateStatusReport(projectData?.metrics || {});
        return report;
      }
    },
    // New Features
    {
      id: 'risk-analysis',
      name: 'Risk Analysis',
      icon: AlertTriangle,
      description: 'Predictive risk assessment and mitigation strategies',
      action: async () => {
        // Implementation needed
        return 'Risk analysis report...';
      }
    },
    {
      id: 'team-insights',
      name: 'Team Insights',
      icon: Users,
      description: 'Team performance analytics and collaboration patterns',
      action: async () => {
        // Implementation needed
        return 'Team insights report...';
      }
    },
    {
      id: 'budget-forecast',
      name: 'Budget Forecast',
      icon: TrendingUp,
      description: 'AI-powered budget predictions and optimization suggestions',
      action: async () => {
        // Implementation needed
        return 'Budget forecast report...';
      }
    },
    {
      id: 'smart-suggestions',
      name: 'Smart Suggestions',
      icon: Lightbulb,
      description: 'Contextual recommendations for project improvement',
      action: async () => {
        // Implementation needed
        return 'Smart suggestions...';
      }
    }
  ];

  const handleFeatureClick = async (feature) => {
    setActiveTab(feature.id);
    setLoading(true);
    setError(null);
    try {
      const result = await feature.action();
      setResult(result);
      // Add to history
      setInsightHistory(prev => [{
        id: Date.now(),
        feature: feature.id,
        timestamp: new Date().toISOString(),
        result
      }, ...prev].slice(0, 10)); // Keep last 10 items
    } catch (err) {
      setError('Failed to generate insights. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      feature: activeTab,
      result,
      projectData: {
        name: projectData?.name,
        department: projectData?.department
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-insight-${activeTab}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-800 dark:to-indigo-900/20 rounded-3xl p-12 shadow-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl relative overflow-hidden mb-12"
        >
          <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-700/25 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                AI-Powered Insights
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Leverage artificial intelligence to optimize your project performance
              </p>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(!showHistory)}
                className="p-3 bg-indigo-600/10 dark:bg-indigo-400/10 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 dark:hover:bg-indigo-400/20 transition-colors"
              >
                <History size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 bg-indigo-600/10 dark:bg-indigo-400/10 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 dark:hover:bg-indigo-400/20 transition-colors"
              >
                <Settings size={20} />
              </motion.button>
              <div className="flex items-center gap-3 px-6 py-3 bg-indigo-600/10 dark:bg-indigo-400/10 rounded-2xl">
                <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">AI Assistant</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-lg shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI Settings</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Detail Level
                    </label>
                    <select
                      value={aiSettings.detailLevel}
                      onChange={(e) => setAiSettings(prev => ({ ...prev, detailLevel: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900"
                    >
                      <option value="high">High Detail</option>
                      <option value="balanced">Balanced</option>
                      <option value="summary">Summary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Focus Areas
                    </label>
                    <div className="space-y-2">
                      {['performance', 'risks', 'opportunities', 'resources', 'timeline'].map(area => (
                        <label key={area} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={aiSettings.focusAreas.includes(area)}
                            onChange={(e) => {
                              setAiSettings(prev => ({
                                ...prev,
                                focusAreas: e.target.checked
                                  ? [...prev.focusAreas, area]
                                  : prev.focusAreas.filter(a => a !== area)
                              }));
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300 capitalize">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-800 shadow-xl border-l border-gray-200 dark:border-gray-700 p-6 z-40"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Insight History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                {insightHistory.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {item.feature}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {item.result}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setResult(item.result)}
                        className="text-xs px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        View
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {/* Implement share functionality */}}
                        className="text-xs px-3 py-1 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        Share
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFeatureClick(feature)}
              className={`relative group overflow-hidden bg-white dark:bg-slate-800 rounded-2xl p-6 text-left transition-all duration-300
                border-2 ${
                  activeTab === feature.id
                    ? 'border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10'
                    : 'border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-xl transition-colors duration-300 ${
                    activeTab === feature.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {feature.name}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900 rounded-full animate-spin">
                    <div className="absolute top-0 right-0 w-4 h-4 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                  </div>
                  <Sparkles className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400 animate-pulse" size={24} />
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">
                  Generating AI insights...
                </p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-red-200 dark:border-red-700"
            >
              <div className="flex items-center gap-4 text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-semibold">Error</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{error}</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setError(null)}
                className="mt-6 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                Dismiss
              </motion.button>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Analysis Complete
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExport}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    title="Export Results"
                  >
                    <Download size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {/* Implement share functionality */}}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    title="Share Results"
                  >
                    <Share2 size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setResult(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    title="Close"
                  >
                    <X size={20} />
                  </motion.button>
                </div>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: result }} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIFeatures; 