const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const gameDataPath = path.join(__dirname, 'games.json');

let gameData = {
  activeBoardId: "default",
  boards: {
    "default": {
      "name": "Default Game",
      "data": { 
        rounds: {
          jeopardy: { categories: [] },
          double: { categories: [] }
        },
        finalJeopardy: { category: "", clue: "", answer: "" }
      }
    }
  }
};

// Create default empty categories structure
function createEmptyCategories() {
  const categories = [];
  for (let i = 0; i < 5; i++) {
    categories.push({
      name: `Category ${i + 1}`,
      questions: [
        { value: 200, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 400, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 600, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 800, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 1000, question: "Enter question here...", answer: "Enter answer here..." }
      ]
    });
  }
  return categories;
}

function createEmptyDoubleCategories() {
  const categories = [];
  for (let i = 0; i < 5; i++) {
    categories.push({
      name: `Category ${i + 1}`,
      questions: [
        { value: 400, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 800, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 1200, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 1600, question: "Enter question here...", answer: "Enter answer here..." },
        { value: 2000, question: "Enter question here...", answer: "Enter answer here..." }
      ]
    });
  }
  return categories;
}

function loadGameData() {
  try {
    if (fs.existsSync(gameDataPath)) {
      const data = fs.readFileSync(gameDataPath, 'utf8');
      gameData = JSON.parse(data);
      console.log("Game data loaded successfully.");
    } else {
      console.log("No game data found, creating default.");
    }
  } catch (err) {
    console.error("Error loading game data:", err);
  }
}

function saveGameData(newData) {
  try {
    fs.writeFileSync(gameDataPath, JSON.stringify(newData, null, 2));
    gameData = newData; // Update memory
    console.log("Game data saved successfully.");
    return true;
  } catch (err) {
    console.error("Error saving game data:", err);
    return false;
  }
}

// Get the full active board data (all rounds + final jeopardy)
function getActiveBoard() {
  const boardId = gameData.activeBoardId || Object.keys(gameData.boards)[0];
  const boardData = gameData.boards[boardId]?.data;
  
  if (!boardData) {
    return { 
      rounds: { jeopardy: { categories: [] }, double: { categories: [] } },
      finalJeopardy: { category: "", clue: "", answer: "" }
    };
  }
  
  return boardData;
}

// Get categories for a specific round
function getRoundCategories(round = 'jeopardy') {
  const boardData = getActiveBoard();
  return boardData.rounds?.[round]?.categories || [];
}

// Get Final Jeopardy data
function getFinalJeopardy() {
  const boardData = getActiveBoard();
  return boardData.finalJeopardy || { category: "", clue: "", answer: "" };
}

// Alias for getRoundCategories
function getCategories(round = 'jeopardy') {
  return getRoundCategories(round);
}

function getGameData() {
  return gameData;
}

// Initial Load
loadGameData();

module.exports = {
  getGameData,
  saveGameData,
  getActiveBoard,
  loadGameData,
  getRoundCategories,
  getFinalJeopardy,
  getCategories,
  createEmptyCategories,
  createEmptyDoubleCategories
};

