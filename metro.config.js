const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Platform-specific extensions
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js'],
  platforms: ['ios', 'android', 'web', 'native'],
  resolveRequest: (context, moduleName, platform) => {
    // Mock react-native-maps for web
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return {
        filePath: path.resolve(__dirname, 'client/mocks/react-native-maps.web.js'),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Disable minification to prevent styles reference error
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: false,
  },
};

module.exports = config; 
