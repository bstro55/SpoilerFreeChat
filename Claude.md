# SpoilerFreeChat

## Project Overview

**SpoilerFreeChat** is a web application that enables spoiler-free live sports conversations. When watching live sports via TV or streaming, broadcast delays vary between viewers. This app synchronizes chat messages based on each user's current game time, ensuring no one receives spoilers from viewers who are ahead in the broadcast.

## The Problem

Two friends are watching the same basketball game. One is on cable TV (minimal delay), the other is on a streaming service (30+ seconds behind). If they text each other, the cable viewer will spoil plays for the streaming viewer. SpoilerFreeChat solves this by intelligently delaying message delivery.

## How It Works

1. **Join a Room** - Users join a chat room for a specific game
2. **Sync Game Time** - Each user inputs their current game clock (e.g., "8:42 left in Q3")
3. **Calculate Offset** - The system determines each user's delay relative to the "live" viewer
4. **Queue Messages** - Incoming messages are held per-user based on their offset
5. **Timed Release** - Messages appear only when the recipient has "caught up" to that moment in the game
6. **Zero Delay for Live Viewers** - The user furthest ahead receives messages instantly

## User Context

- **Developer experience**: Learning programmer, not expert level
- **Explanation needs**: All technical decisions require clear, beginner-friendly explanations
- **Code philosophy**: Prioritize understandability over cleverness
- **Learning goals**: Fully understand each decision made during development

## Technical Requirements

### Must Have
- Web application (mobile is a future goal)
- Clean, modern, maintainable code
- Security is paramount
- No hardcoded temporary values
- Real-time messaging capability

### Preferences
- Widely used, well-documented frameworks
- Easy local development setup
- Cheap/free deployment options
- Avoid over-complex DevOps early on

## Development Workflow

### Testing
- Include basic automated tests where practical
- Focus on simple, meaningful tests over exhaustive coverage
- Use standard tools for the chosen stack
- Provide clear instructions for running tests locally
- No complex CI/CD early on

### Git & GitHub
- Project lives in a GitHub repository
- Commits represent logical, working checkpoints
- Each commit should be a functioning state
- Short, clear commit messages
- Avoid unnecessary micro-commits
- Document major changes with explanations

### Documentation
- Keep this Claude.md file updated throughout development
- Simple, copy/paste-able setup instructions
- Update docs when project structure changes

## Current State

- **Phase**: Starting from scratch
- **Tech stack**: To be determined
- **Existing code**: None
- **Dependencies**: None yet

## Open Questions

These items need discussion before/during implementation:

1. **Tech Stack** - Frontend framework, backend language, database, real-time solution
2. **Deployment Platform** - Where to host (Vercel, Railway, Render, etc.)
3. **Authentication** - How users identify themselves (anonymous, accounts, etc.)
4. **Room Management** - How game rooms are created and discovered
5. **Game Time Input** - Best UX for entering/updating game time

## Project Structure

*To be updated as the project develops*

```
SpoilerFreeChat/
├── Claude.md          # This file - project documentation
└── ...                # Structure TBD based on tech stack
```

## Setup Instructions

*To be added once tech stack is chosen*

## Running Tests

*To be added once testing framework is set up*
