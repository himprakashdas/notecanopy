# Contributing to NoteTree

Thanks for considering contributing to NoteTree! This document will help you get started.

## Getting Started

### Prerequisites

- Node.js v18 or higher
- pnpm (install with `npm install -g pnpm`)
- A code editor (VS Code recommended)

### Setting Up Your Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/yourusername/notetree.git
   cd notetree
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Set up your environment variables:

   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

5. Start the dev server:
   ```bash
   pnpm dev
   ```

## How to Contribute

### Reporting Bugs

Found a bug? Please open an issue with:

- A clear, descriptive title
- Steps to reproduce the problem
- What you expected to happen vs what actually happened
- Screenshots if applicable
- Your browser and OS version

### Suggesting Features

Have an idea? Open an issue with:

- A clear description of the feature
- Why you think it would be useful
- Any implementation ideas you have

### Submitting Code

1. **Create a branch** for your changes:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Keep commits focused and atomic

3. **Test your changes**:
   - Make sure the app runs without errors
   - Test the feature/fix thoroughly
   - Check that you didn't break existing functionality

4. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   - Give it a clear title and description
   - Reference any related issues
   - Explain what you changed and why

## Code Style Guidelines

### General Principles

- **Keep it simple**: Readable code is better than clever code
- **Be consistent**: Follow the patterns already in the codebase
- **Comment when needed**: Explain the "why", not the "what"

### TypeScript

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` unless absolutely necessary

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use meaningful component and prop names

### State Management

- Use Zustand stores for global state
- Keep local state in components when possible
- Don't duplicate state unnecessarily

### Styling

- Use the existing CSS variables and design tokens
- Follow the established design patterns
- Keep styles modular and component-scoped

## Project Structure

```
src/
├── components/       # React components
│   ├── canvas/      # Flow canvas and nodes
│   ├── layout/      # Layout components (sidebar, modals)
│   ├── project/     # Project-related components
│   └── ui/          # Reusable UI components
├── db/              # Database (Dexie/IndexedDB)
├── hooks/           # Custom React hooks
├── store/           # Zustand state stores
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Database Schema

NoteTree uses Dexie (IndexedDB) for local storage:

- **projects**: Project metadata
- **nodes**: Individual conversation nodes
- **edges**: Connections between nodes

When making changes to the schema, ensure backward compatibility or provide migration logic.

## AI Integration

The app supports multiple AI providers through a unified interface in `src/utils/ai.ts`. When adding support for new providers:

- Follow the existing pattern
- Handle errors gracefully with user-friendly messages
- Support streaming responses
- Implement proper token counting

## Testing

Currently, the project doesn't have automated tests (contributions welcome!). For now:

- Manually test your changes thoroughly
- Test in different browsers if possible
- Check the console for errors
- Verify database operations work correctly

## Need Help?

- Check existing issues and PRs
- Open a discussion if you're unsure about something
- Ask questions in your PR if you need feedback

## Code of Conduct

Be respectful, constructive, and helpful. We're all here to make NoteTree better.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
