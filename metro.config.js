
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];

// Fix for react-async-hook module resolution issue
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Handle react-async-hook module resolution
    if (moduleName === 'react-async-hook') {
      const reactAsyncHookPath = path.resolve(
        __dirname,
        'node_modules/react-async-hook/dist/index.js'
      );
      
      return {
        filePath: reactAsyncHookPath,
        type: 'sourceFile',
      };
    }

    // Use default resolver for all other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
