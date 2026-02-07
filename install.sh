#!/bin/bash

echo "📦 Installing Frontend Dependencies..."
echo ""

# Clean previous installation
echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

# Install dependencies
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps

# Check if react-scripts is installed
if [ -f "node_modules/.bin/react-scripts" ]; then
    echo ""
    echo "✅ Installation successful!"
    echo ""
    echo "You can now run: npm start"
else
    echo ""
    echo "❌ Installation failed. react-scripts not found."
    echo ""
    echo "Try manually:"
    echo "  npm install react-scripts@5.0.1 --save-dev"
    echo "  npm install --legacy-peer-deps"
fi
