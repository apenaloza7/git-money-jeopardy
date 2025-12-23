const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const gameDataPath = path.join(__dirname, 'games.json');

let gameData = {
  activeBoardId: "default",
  boards: {
    "default": {
      "name": "Default Game",
      "data": { categories: [] }
    }
  }
};

function loadGameData() {
  try {
    if (fs.existsSync(gameDataPath)) {
      const data = fs.readFileSync(gameDataPath, 'utf8');
      const loaded = JSON.parse(data);
      
      // Migration check: if old format (has 'categories' at top level), wrap it
      if (loaded.categories && Array.isArray(loaded.categories)) {
        console.log("Migrating old data format...");
        gameData = {
          activeBoardId: "default",
          boards: {
            "default": {
              name: "Default Game",
              data: loaded
            }
          }
        };
        saveGameData(gameData);
      } else {
        gameData = loaded;
      }
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

function getActiveBoard() {
  const boardId = gameData.activeBoardId || Object.keys(gameData.boards)[0];
  return gameData.boards[boardId]?.data || { categories: [] };
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
  loadGameData
};

