(async () => {
  try {
    await import('./fetch-players.mjs');
  } catch (error) {
    console.error('Failed to run player sync:', error);
    process.exitCode = 1;
  }
})();
