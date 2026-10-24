const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Sentry's Metro serializer adds the debug ids that tie uploaded source maps to crashes.
module.exports = getSentryExpoConfig(__dirname);
