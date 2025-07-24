import React from 'react';
import { Chart } from 'react-google-charts';
import { motion } from 'framer-motion';

const GanttChart = ({ tasks }) => {
  const getGanttData = () => {
    const data = [
      [
        { type: 'string', label: 'Task ID' },
        { type: 'string', label: 'Task Name' },
        { type: 'string', label: 'Resource' },
        { type: 'date', label: 'Start Date' },
        { type: 'date', label: 'End Date' },
        { type: 'number', label: 'Duration' },
        { type: 'number', label: 'Percent Complete' },
        { type: 'string', label: 'Dependencies' },
      ]
    ];

    tasks.forEach(task => {
      data.push([
        task.id,
        task.title,
        task.assignee || '',
        new Date(task.startDate),
        new Date(task.dueDate),
        null,
        task.status === 'done' ? 100 : task.status === 'review' ? 75 : task.status === 'inProgress' ? 50 : 0,
        task.dependencies?.join(',') || null
      ]);
    });

    return data;
  };

  const options = {
    height: 400,
    gantt: {
      trackHeight: 30,
      barHeight: 20,
      labelStyle: {
        fontName: 'Inter',
        fontSize: 14,
        color: '#374151'
      },
      barCornerRadius: 3,
      barHeightRatio: 0.75,
      arrow: {
        angle: 100,
        width: 5,
        color: '#6B7280',
        radius: 0
      }
    },
    backgroundColor: 'transparent',
    chartArea: {
      left: '10%',
      right: '5%',
      top: '5%',
      bottom: '5%'
    },
    legend: {
      position: 'none'
    },
    timeline: {
      groupByRowLabel: true,
      showRowLabels: true,
      singleColor: '#E5E7EB'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Gantt Chart View</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-indigo-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Overdue</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Chart
          chartType="Gantt"
          width="100%"
          height="400px"
          data={getGanttData()}
          options={options}
        />
      </div>
    </motion.div>
  );
};

export default GanttChart; 