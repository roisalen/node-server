module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/jest-env.js'],
  testMatch: ['<rootDir>/test/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/roisalen-cdk/'],
  verbose: true,
};
