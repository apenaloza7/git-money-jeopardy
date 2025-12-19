# GIT-MONEY-JEOPARDY System Design

## Architecture Overview

The system follows a client-server architecture using a local Node.js server to facilitate real-time communication between the Host (Game Board) and Players (Mobile Buzzers).

### System Components

```mermaid
graph TD
    subgraph Local_Machine [Local Machine / Host Computer]
        Server[Node.js Server]
        Storage[(File System / JSON)]
        HostClient[Host Browser Client]
    end

    subgraph External_Devices [Player Devices]
        Player1[Mobile Client 1]
        Player2[Mobile Client 2]
        Player3[Mobile Client 3]
    end

    HostClient <-->|"HTTP / WebSockets"| Server
    Server <-->|"Read/Write"| Storage
    Player1 <-->|"HTTP / WebSockets"| Server
    Player2 <-->|"HTTP / WebSockets"| Server
    Player3 <-->|"HTTP / WebSockets"| Server
```

## Data Flow: Game State Synchronization

The server maintains the authoritative state of the game. State changes propagate to all connected clients via Socket.io events.

```mermaid
sequenceDiagram
    participant Host as Host Client
    participant Server as Node.js Server
    participant Player as Player Client

    Note over Host, Player: Initialization
    Host->>Server: Request Game Board
    Server->>Host: Send JSON Data
    Player->>Server: Connect (Join Room)

    Note over Host, Player: Gameplay Loop
    Host->>Server: Event: Select Question
    Server->>Host: Event: Show Clue (Board Update)
    Server->>Player: Event: Unlock Buzzers

    Note over Host, Player: Buzzer Race
    Player->>Server: Event: Buzz
    Server->>Server: Lock State (First In)
    Server->>Host: Event: Update UI (Show Winner)
    Server->>Player: Event: Lock All Buzzers

    Note over Host, Player: Resolution
    Host->>Server: Event: Award Points / Close Clue
    Server->>Host: Update Scoreboard
```

## Component Responsibilities

### Backend (Node.js + Express + Socket.io)
- **Static File Serving**: Delivers HTML/CSS/JS assets to clients.
- **State Management**: Tracks current active question, buzzer status (locked/open), and player connection status.
- **Persistence**: Handles file I/O operations to read/write game configurations to `games.json`.

### Host Client (Browser)
- **Presentation Layer**: Renders the Jeopardy grid using CSS Grid.
- **Game Logic Controller**: Initiates game phases (reveal clue, start timer, award points).
- **Editor Module**: Provides an interface to modify game data and triggers persistence requests to the server.

### Player Client (Mobile Browser)
- **Input Interface**: Simple, low-latency interface for buzzing.
- **Feedback Display**: Visual indicators for "Locked", "Open", and "Win/Lose" states based on server signals.

## Data Structure

The game data is stored in a JSON format.

```json
{
  "categories": [
    {
      "name": "Category Name",
      "questions": [
        {
          "value": 200,
          "question": "Clue text",
          "answer": "Answer text",
          "dailyDouble": false
        }
      ]
    }
  ]
}
```
