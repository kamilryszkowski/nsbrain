/**
 * Evaluation question sets for LLM pipeline testing
 */

const evalQuestions = [
  {
    category: "Core Concepts",
    questions: [
      "What's the difference between a Startup Society and a Network State?"
    ]
  },
  {
    category: "Travel and Connectivity",
    questions: [
      "How do I travel between Singapore and Malaysia?",
      "How do I get to the Network State?"
    ]
  },
  {
    category: "Accommodation and Infrastructure",
    questions: [
      "How big are the rooms, and how is the internet?",
      "How far is the coworking space from the hotel?"
    ]
  },
  {
    category: "Forest City and Surroundings",
    questions: [
      "What's another café nearby?",
      "What's the best food in the area?"
    ]
  },
  {
    category: "Events: Past, Present, and Future",
    questions: [
      "What events are happening today or this week?",
      "When is the next poker tournament?",
      "What events did I miss last weekend?"
    ]
  },
  {
    category: "Contributing to the Community",
    questions: [
      "How can I do something for the community?"
    ]
  },
  {
    category: "The People of the Network State (NS)",
    questions: [
      "How many people are there at the Network State?",
      "Who handles IT support for NS facilities?",
      "Who at the Network State works in venture capital?",
      "Who is <@1281087535413596193>?",
      "Who is Jacob Dev?"
    ]
  },
  {
    category: "How to Build a Network State",
    questions: [
      "How do you build a Network State?"
    ]
  },
  {
    category: "Concrete Plan of the Core Team",
    questions: [
      "How quickly do they want to scale?"
    ]
  },
  {
    category: "Resources",
    questions: [
      "Can you give me an intro video about the Network State?"
    ]
  }
];

// Helper function to flatten the questions for easy iteration
const getFlattenedQuestions = () => {
  return evalQuestions.flatMap(category => 
    category.questions.map(question => ({
      category: category.category,
      question
    }))
  );
};

export { evalQuestions, getFlattenedQuestions }; 