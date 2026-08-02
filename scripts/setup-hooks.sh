#!/bin/bash
# Run this ONCE after cloning the repo to install git hooks
# Usage: bash scripts/setup-hooks.sh

echo "🔧 Setting up QLekha git hooks..."

# Install root dependencies (husky)
npm install

# Initialize husky
npx husky

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# Install test dependencies
echo "📦 Installing test dependencies..."
cd tests && npm install && cd ..

# Run tests once to verify everything works
echo "🧪 Running initial test verification..."
cd tests && npm run test:unit
if [ $? -eq 0 ]; then
  echo "✅ Setup complete! Git hooks are active."
  echo "   Tests will now run automatically before each commit and push."
else
  echo "⚠️  Some tests failed. Check the output above."
fi
