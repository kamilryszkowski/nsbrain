/**
 * Evaluation question sets for LLM pipeline testing
 */

const evalQuestions = [
  // Original questions
  "What's the difference between a Startup Society and a Network State?",
  "How do I travel between Singapore and Malaysia?",
  "How do I get to the Network State?",
  "How big are the rooms, and how is the internet?",
  "How far is the coworking space from the hotel?",
  "What's another café nearby?",
  "What's the best food in the area?",
  "What events are happening today or this week?",
  "When is the next poker tournament?",
  "What events did I miss last weekend?",
  "How can I do something for the community?",
  "How many people are there at the Network State?",
  "Who handles IT support for NS facilities?",
  "Who at the Network State works in venture capital?",
  "Who is <@1281087535413596193>?",
  "Who is Jacob Dev?",
  "How do you build a Network State?",
  "How quickly do they want to scale?",
  "Can you give me an intro video about the Network State?",
  
  // New questions (excluding duplicates)
  "What events are scheduled at Network School this week?",
  "What does Balaji think about the future role of the US dollar?",
  "Who has a finance background in NS?",
  "How can I get transport to Singapore?",
  "Who at NS has children?",
  "What events are happening today?",
  "How much is the taxi from forest city to Singapore?",
  "What sports events are coming up?",
  "When is yoga?",
  "Where is the gym?",
  "When is the next poker night?"
];

// Helper function to get questions for evaluation
const getFlattenedQuestions = () => {
  return evalQuestions.map(question => ({
    question
  }));
};

export { evalQuestions, getFlattenedQuestions }; 