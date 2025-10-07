# oracle23ai-fhir-lab

A modern Node.js TypeScript project with ESM support.

## Features

- 🚀 **TypeScript** with strict configuration
- 📦 **ESM** (ES Modules) support
- 🧪 **Vitest** for testing with coverage
- 🔍 **ESLint** for code linting
- 💅 **Prettier** for code formatting
- ⚡ **tsx** for fast development with hot reload

## Prerequisites

- Node.js 18+ (latest recommended)
- npm or yarn

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build the project
npm run build

# Run the built project
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Project Structure

```
oracle23ai-fhir-lab/
├── src/
│   ├── __tests__/
│   │   └── index.test.ts
│   ├── index.ts          # Main entry point
│   └── utils.ts          # Utility functions
├── dist/                 # Built output (generated)
├── coverage/            # Test coverage (generated)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues
- `npm run type-check` - Check TypeScript types without building
- `npm run clean` - Remove build artifacts

## Development

This project uses:
- **TypeScript** in strict mode with modern ES2022 target
- **ESM** modules (`"type": "module"` in package.json)
- **Vitest** for fast unit testing
- **ESLint** with TypeScript support
- **Prettier** for consistent formatting

## License

MIT
