const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .pte = binaire de modele ExecuTorch, doit etre traite comme un asset (pas du code)
config.resolver.assetExts.push('pte');

module.exports = config;
