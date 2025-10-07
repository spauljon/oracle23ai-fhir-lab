#!/usr/bin/env node

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  console.log('🎉 Hello from TypeScript with ESM!');
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  
  // Example async operation
  const message = await getWelcomeMessage();
  console.log(message);
}

/**
 * Get a welcome message asynchronously
 */
async function getWelcomeMessage(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Welcome to your new TypeScript ESM project! 🚀');
    }, 100);
  });
}

// Example of importing JSON (requires resolveJsonModule: true)
// import packageJson from '../package.json' assert { type: 'json' };

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Application error:', error);
    process.exit(1);
  });
}

export { main, getWelcomeMessage };
