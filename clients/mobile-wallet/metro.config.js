// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('@react-native/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  config.resolver.extraNodeModules = {
    buffer: require.resolve('buffer'),
    stream: require.resolve('readable-stream'),
    crypto: require.resolve('react-native-crypto'),
  };
  return config;
})(); 