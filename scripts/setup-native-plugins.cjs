#!/usr/bin/env node

/**
 * Setup script for restoring native Android plugins after `npx cap add android`
 * 
 * Run this script with: npm run setup:android
 * Or directly: node scripts/setup-native-plugins.js
 */

const fs = require('fs');
const path = require('path');

const ANDROID_PLUGINS_DIR = 'android/app/src/main/java/app/lovable/lanchat/plugins';
const ANDROID_MAIN_DIR = 'android/app/src/main/java/app/lovable/lanchat';
const NATIVE_PLUGINS_DIR = 'native-plugins/android';

const files = [
  {
    source: 'LanDiscoveryPlugin.java',
    dest: `${ANDROID_PLUGINS_DIR}/LanDiscoveryPlugin.java`,
    type: 'plugin'
  },
  {
    source: 'WebSocketServerPlugin.java',
    dest: `${ANDROID_PLUGINS_DIR}/WebSocketServerPlugin.java`,
    type: 'plugin'
  },
  {
    source: 'MainActivity.java',
    dest: `${ANDROID_MAIN_DIR}/MainActivity.java`,
    type: 'main'
  }
];

const GRADLE_DEPENDENCIES = `
    // WebSocket library for server functionality
    implementation 'org.java-websocket:Java-WebSocket:1.5.4'
    
    // WebRTC for audio/video calls
    implementation 'io.github.webrtc-sdk:android:125.6422.06.1'
`;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  }
}

function copyFile(source, dest) {
  const sourcePath = path.join(NATIVE_PLUGINS_DIR, source);
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`✗ Source file not found: ${sourcePath}`);
    return false;
  }
  
  ensureDir(path.dirname(dest));
  
  const content = fs.readFileSync(sourcePath, 'utf8');
  fs.writeFileSync(dest, content);
  console.log(`✓ Copied: ${source} → ${dest}`);
  return true;
}

function updateBuildGradle() {
  const gradlePath = 'android/app/build.gradle';
  
  if (!fs.existsSync(gradlePath)) {
    console.error(`✗ build.gradle not found at: ${gradlePath}`);
    return false;
  }
  
  let content = fs.readFileSync(gradlePath, 'utf8');
  
  // Check if dependencies already exist
  if (content.includes('Java-WebSocket')) {
    console.log('✓ build.gradle already has WebSocket dependency');
    return true;
  }
  
  // Find the dependencies block and add our dependencies
  const dependenciesMatch = content.match(/dependencies\s*\{/);
  if (dependenciesMatch) {
    const insertIndex = dependenciesMatch.index + dependenciesMatch[0].length;
    content = content.slice(0, insertIndex) + GRADLE_DEPENDENCIES + content.slice(insertIndex);
    fs.writeFileSync(gradlePath, content);
    console.log('✓ Added dependencies to build.gradle');
    return true;
  }
  
  console.error('✗ Could not find dependencies block in build.gradle');
  return false;
}

function checkAndroidProject() {
  if (!fs.existsSync('android')) {
    console.error('✗ Android project not found. Run `npx cap add android` first.');
    return false;
  }
  return true;
}

function main() {
  console.log('🔧 Setting up native Android plugins for LAN Chat\n');
  
  // Check if android project exists
  if (!checkAndroidProject()) {
    process.exit(1);
  }
  
  // Check if native-plugins directory exists
  if (!fs.existsSync(NATIVE_PLUGINS_DIR)) {
    console.error(`✗ Native plugins directory not found: ${NATIVE_PLUGINS_DIR}`);
    process.exit(1);
  }
  
  let success = true;
  
  // Copy plugin files
  console.log('📂 Copying plugin files...');
  for (const file of files) {
    if (!copyFile(file.source, file.dest)) {
      success = false;
    }
  }
  
  // Update build.gradle
  console.log('\n📝 Updating build.gradle...');
  if (!updateBuildGradle()) {
    success = false;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ Native plugins setup complete!\n');
    console.log('Next steps:');
    console.log('  1. npx cap sync android');
    console.log('  2. cd android && ./gradlew assembleDebug');
  } else {
    console.log('⚠️ Some operations failed. Please check the errors above.');
    process.exit(1);
  }
}

main();
