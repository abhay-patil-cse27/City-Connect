import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face API
const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY);

// Helper function for project-specific text generation
export async function generateProjectInsights(prompt, projectContext) {
  try {
    const enhancedPrompt = `
      Context: You are an AI assistant for an Indian urban governance system.
      Current Project: ${projectContext.name}
      Department: ${projectContext.department}
      Team Members: ${projectContext.teamMembers?.join(', ')}
      
      Consider the following Indian context:
      - Government of India initiatives and policies
      - State-specific regulations and requirements
      - Local governance structures (Gram Panchayat, Municipal Corporation, etc.)
      - Digital India and e-governance standards
      - Local language and cultural considerations
      - Community engagement requirements
      
      ${prompt}
      
      Please provide specific, actionable insights related to this project.
    `;
    
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: enhancedPrompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
      }
    });
    
    return response.generated_text;
  } catch (error) {
    console.error('\nError details:', error);
    throw error;
  }
}

// Helper function for analyzing project milestones and dependencies
export async function analyzeMilestones(projectData) {
  try {
    const prompt = `
      Analyze this Indian urban governance project's milestones and provide strategic insights:
      Project Context: ${JSON.stringify(projectData)}
      
      Consider the following aspects:
      1. Critical path analysis with government approval timelines
      2. Risk assessment for each milestone considering local challenges
      3. Resource optimization suggestions based on government guidelines
      4. Dependencies on other government departments and systems
      5. Timeline adjustments considering government processes
      6. Inter-departmental coordination requirements
      7. Compliance with Digital India initiatives
      8. Local community engagement milestones
      
      Format the response in a clear, structured manner with specific actionable items.
    `;
    
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
      }
    });
    
    return response.generated_text;
  } catch (error) {
    console.error('\nError details:', error);
    throw error;
  }
}

// Helper function for generating department-specific meeting summaries
export async function generateMeetingSummary(meetingNotes, departmentContext) {
  try {
    const prompt = `
      Context: Inter-departmental meeting summary for ${departmentContext.name}
      Participants: ${departmentContext.participants}
      Project Phase: ${departmentContext.phase}
      
      Meeting Notes:
      ${meetingNotes}
      
      Please provide:
      1. Key decisions and their implications for each department
      2. Action items with assigned departments
      3. Critical dependencies identified
      4. Resource allocation updates
      5. Risk factors and mitigation strategies
      6. Next steps and inter-departmental coordination requirements
    `;
    
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
      }
    });
    
    return response.generated_text;
  } catch (error) {
    console.error('\nError details:', error);
    throw error;
  }
}

// Helper function for resource optimization suggestions
export async function analyzeResourceAllocation(resourceData) {
  try {
    const prompt = `
      Analyze current resource allocation across departments:
      ${JSON.stringify(resourceData)}
      
      Provide insights on:
      1. Resource utilization efficiency
      2. Cross-departmental resource sharing opportunities
      3. Bottleneck identification and solutions
      4. Cost optimization recommendations
      5. Capacity planning suggestions
      6. Risk mitigation strategies
      
      Focus on practical, implementable solutions that improve inter-departmental coordination.
    `;
    
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
      }
    });
    
    return response.generated_text;
  } catch (error) {
    console.error('\nError details:', error);
    throw error;
  }
}

// Helper function for generating project status reports
export async function generateStatusReport(projectMetrics) {
  try {
    const prompt = `
      Generate a comprehensive project status report based on:
      ${JSON.stringify(projectMetrics)}
      
      Include analysis of:
      1. Current progress vs. planned milestones
      2. Department-wise performance metrics
      3. Resource utilization effectiveness
      4. Risk assessment and mitigation status
      5. Inter-departmental coordination effectiveness
      6. Recommendations for improvement
      
      Format as a professional report with clear sections and actionable insights.
    `;
    
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 800,
        temperature: 0.7,
        top_p: 0.95,
      }
    });
    
    return response.generated_text;
  } catch (error) {
    console.error('\nError details:', error);
    throw error;
  }
}

export const generateTaskSuggestions = async (projectData) => {
  try {
    const prompt = `You are a task management AI specialized in Indian urban governance projects. Based on the following project data, suggest new tasks that would be valuable for this project.
    Project Name: ${projectData.name}
    Department: ${projectData.department}
    Current Tasks: ${JSON.stringify(projectData.tasks)}
    Team Members: ${projectData.teamMembers.map(m => m.name).join(', ')}
    
    IMPORTANT: Generate 2-3 new tasks that would be valuable for this Indian urban governance project. Consider:
    - Local government regulations and compliance requirements
    - Stakeholder engagement with local communities
    - Integration with existing government systems
    - Digital India initiatives and e-governance standards
    - Local language support requirements
    - Cultural and regional considerations
    
    Respond ONLY with a JSON object containing the actual tasks, not the template.
    Each task should have real values for title, description, assignee (must be one of the team members listed above), priority, and dates.
    Example of what we want (but with your own actual tasks):
    {
      "tasks": [
        {
          "title": "Conduct Gram Panchayat stakeholder consultations",
          "description": "Organize meetings with local Gram Panchayat representatives to gather requirements and understand local governance needs",
          "assignee": "John Smith",
          "priority": "high",
          "startDate": "2024-03-20",
          "dueDate": "2024-03-25"
        }
      ]
    }`;

    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
      },
    });

    // Clean and parse the response
    const cleanedResponse = response.generated_text.trim();
    
    // Find the first complete JSON object
    let jsonStr = '';
    let bracketCount = 0;
    let startIndex = -1;
    
    for (let i = 0; i < cleanedResponse.length; i++) {
      if (cleanedResponse[i] === '{') {
        if (startIndex === -1) startIndex = i;
        bracketCount++;
      } else if (cleanedResponse[i] === '}') {
        bracketCount--;
        if (bracketCount === 0) {
          jsonStr = cleanedResponse.slice(startIndex, i + 1);
          break;
        }
      }
    }

    if (!jsonStr) {
      throw new Error('No valid JSON object found in response');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      
      // Handle both single task and tasks array responses
      if (!parsed.tasks && typeof parsed === 'object') {
        // If it's a single task object, wrap it in a tasks array
        return { tasks: [parsed] };
      } else if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid response structure: missing tasks array');
      }
      
      return parsed;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Attempted to parse:', jsonStr);
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('Error generating task suggestions:', error);
    throw error;
  }
};

export const optimizeBudgetAllocation = async (projectData) => {
  try {
    const prompt = `You are a budget optimization AI specialized in Indian urban governance projects. Based on the following project data, suggest optimal budget allocation.
    Project Name: ${projectData.name}
    Total Budget: ${projectData.budget.total}
    Current Allocation: ${JSON.stringify(projectData.budget.categories)}
    Project Progress: ${projectData.progress}%
    
    IMPORTANT: Generate actual budget optimization suggestions with real numbers. Consider:
    - Government of India funding guidelines
    - State-specific budget allocation rules
    - Digital India initiative requirements
    - Local infrastructure costs
    - Training and capacity building needs
    - Maintenance and support costs
    
    Respond ONLY with a JSON object containing the actual budget allocations, not the template.
    Each category should have real numbers for allocated and spent amounts that sum up to the total budget.
    Example of what we want (but with your own actual numbers):
    {
      "categories": [
        {
          "id": "infrastructure",
          "allocated": 500000,
          "spent": 250000
        },
        {
          "id": "training",
          "allocated": 300000,
          "spent": 150000
        }
      ],
      "recommendations": "Reallocate 50000 from infrastructure to training to ensure proper capacity building of local government officials"
    }`;

    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
      },
    });

    // Clean and parse the response
    const cleanedResponse = response.generated_text.trim();
    
    // Find the first complete JSON object
    let jsonStr = '';
    let bracketCount = 0;
    let startIndex = -1;
    
    for (let i = 0; i < cleanedResponse.length; i++) {
      if (cleanedResponse[i] === '{') {
        if (startIndex === -1) startIndex = i;
        bracketCount++;
      } else if (cleanedResponse[i] === '}') {
        bracketCount--;
        if (bracketCount === 0) {
          jsonStr = cleanedResponse.slice(startIndex, i + 1);
          break;
        }
      }
    }

    if (!jsonStr) {
      throw new Error('No valid JSON object found in response');
    }

    try {
      const parsed = JSON.parse(jsonStr);
      // Validate the response structure
      if (!parsed.categories || !Array.isArray(parsed.categories)) {
        throw new Error('Invalid response structure: missing categories array');
      }
      if (!parsed.recommendations || typeof parsed.recommendations !== 'string') {
        throw new Error('Invalid response structure: missing recommendations string');
      }
      return parsed;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Attempted to parse:', jsonStr);
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (error) {
    console.error('Error optimizing budget:', error);
    throw error;
  }
}; 