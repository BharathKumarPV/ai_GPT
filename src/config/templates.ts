export interface PromptTemplate {
  label: string;
  text: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  { 
    label: "Code Review", 
    text: "Please review the following code for security vulnerabilities, performance issues, and best practices:\n\n```\n\n```" 
  },
  { 
    label: "Summarize", 
    text: "Please provide a concise summary of the following text, highlighting the main points:\n\n" 
  },
  { 
    label: "Translate", 
    text: "Translate the following text into [Language]:\n\n" 
  },
  { 
    label: "Brainstorm", 
    text: "Generate 10 creative ideas for [Topic]:\n\n" 
  },
  { 
    label: "Explain to a 5-year-old", 
    text: "Explain the concept of [Concept] in simple terms that a 5-year-old would understand:\n\n" 
  }
];
