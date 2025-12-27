# Git Money Jeopardy - Client

This is the frontend client for the Git Money Jeopardy game, built with React, TypeScript, and Vite. It serves as the interface for the main game board, host controls, and player interaction.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Routing:** React Router DOM 7
- **Real-time Communication:** Socket.io Client
- **Utilities:** react-qr-code

## Project Structure

```
client/src/
├── assets/              # Static assets (e.g. logos)
├── components/
│   ├── theme/           # Shared layout + Tailwind style helpers
│   │   ├── JeopardyShell.tsx
│   │   └── theme.ts
│   ├── views/           # Route-level page components
│   │   ├── SplashView.tsx        # Landing page
│   │   ├── HostLoginView.tsx     # Host authentication
│   │   ├── HostDashboardView.tsx # Game control panel for the host
│   │   ├── PlayerView.tsx        # Interface for players (buzzer/answers)
│   │   └── EditorView.tsx        # Game data editor
│   ├── GameBoard.tsx    # The main Jeopardy board display
│   └── RulesModal.tsx   # In-game rules/help modal
├── utils/
│   └── audio.ts         # Sound effects helpers
├── constants.ts         # Shared constants (server URL, timings, etc.)
├── App.css              # App-level styles
├── App.tsx              # Main application component, routing, and socket setup
├── main.tsx             # Entry point
└── index.css            # Global styles (Tailwind directives)
```

## Architecture

### Routing

The application uses `react-router-dom` to manage different views:

- `/` - **Splash View**: Entry point for users.
- `/board` - **Game Board**: The main display screen showing categories and clues. Intended to be projected or shared on a big screen.
- `/play` - **Player View**: Mobile-friendly interface for players to buzz in and answer questions.
- `/editor` - **Editor**: Tool for creating and modifying game files.
- `/host` - **Host Login**: Authentication for the game host.
- `/host/dashboard` - **Host Dashboard**: Protected control panel for the host to manage the game flow.

### State Management & Networking

The application relies on **Socket.io** for real-time synchronization with the server.

- **Connection:** The socket connection is initialized in `App.tsx` and shared or passed down to components.
- **Game Data:** The global `gameData` state in `App.tsx` holds the current categories and questions. It is updated via the `init-game` socket event.
- **Live Updates:** Connection status is tracked globally. Components emit events (like buzzing in) and listen for server updates to keep all views in sync.

## Setup & Running

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    npm run dev
    ```
    The application will act as the frontend and attempts to connect to the backend server (defaulting to port 3001).

3.  **Build for Production:**
    ```bash
    npm run build
    ```
