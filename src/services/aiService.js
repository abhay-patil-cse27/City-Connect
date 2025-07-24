import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/facebook/opt-350m';
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;

export const generateAIResponse = async (input, projectId = null) => {
  try {
    let context = '';
    
    // If projectId is provided, fetch project context
    if (projectId) {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        context = `Project Context: ${projectData.name} - ${projectData.description}\n`;
      }
    }

    // Prepare the prompt with context
    const prompt = `${context}User Query: ${input}\nAssistant:`;

    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 200,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false,
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    return data[0].generated_text;
  } catch (error) {
    console.error('AI Response Error:', error);
    return generateFallbackResponse(input, projectId);
  }
};

const generateFallbackResponse = (input, projectId) => {
  const lowerInput = input.toLowerCase();
  
  if (projectId) {
    return `I understand you're asking about the project. Here's what I can help you with:
1. Project details and status
2. Team members and roles
3. Tasks and deadlines
4. Resources and budget
5. Documents and files

What specific information would you like to know about the project?`;
  }
  
  if (lowerInput.includes('help') || lowerInput.includes('guide')) {
    return `I can help you with:
1. Project Management
   - Create and manage projects
   - Track progress and deadlines
   - Assign tasks to team members
   - Monitor project status

2. Team Collaboration
   - Start chats with team members
   - Share files and documents
   - Discuss project updates
   - Manage department resources

3. Document Management
   - Upload and organize files
   - Share documents with team
   - Track document versions
   - Manage access permissions

4. Department Management
   - View department structure
   - Manage team members
   - Track department budgets
   - Monitor resource allocation

What would you like to know more about?`;
  }
  
  if (lowerInput.includes('chat') || lowerInput.includes('message')) {
    return `To start a chat:
1. Click the "New Chat" button
2. Select a user to chat with
3. Type your message and press send

Features:
- Send text messages
- Share files and images
- Use emojis and reactions
- Create group chats
- Search message history`;
  }
  
  if (lowerInput.includes('project') || lowerInput.includes('task')) {
    return `Project Management Features:
1. Project Creation
   - Set project name and description
   - Define start and end dates
   - Assign project manager
   - Set project status

2. Task Management
   - Create and assign tasks
   - Set priorities and deadlines
   - Track task progress
   - Add task comments

3. Team Collaboration
   - Invite team members
   - Assign roles and permissions
   - Share project updates
   - Track team activity

4. Project Monitoring
   - View project timeline
   - Track milestones
   - Monitor resource usage
   - Generate reports`;
  }
  
  if (lowerInput.includes('department') || lowerInput.includes('team')) {
    return `Department Management Features:
1. Department Overview
   - View department structure
   - See team members
   - Track department goals
   - Monitor performance

2. Resource Management
   - Allocate resources
   - Track department budget
   - Manage equipment
   - Monitor utilization

3. Team Management
   - Add/remove team members
   - Assign roles
   - Set permissions
   - Track attendance

4. Department Analytics
   - View department metrics
   - Track progress
   - Generate reports
   - Monitor efficiency`;
  }
  
  return `I'm here to help! I can assist you with:
1. Project management and tracking
2. Team collaboration and communication
3. Document organization and sharing
4. Department management and resources
5. Task assignment and monitoring

What specific aspect would you like to know more about?`;
}; 