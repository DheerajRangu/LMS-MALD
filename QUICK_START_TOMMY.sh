#!/bin/bash

echo "=============================================="
echo "  🤖 TOMMY AI ASSISTANT - QUICK START SETUP"
echo "=============================================="
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📋 SETUP CHECKLIST:"
echo ""

# Step 1: Check .env file
echo "Step 1️⃣  Configuration File"
if [ -f "backend/.env" ]; then
    echo "   ✅ backend/.env exists"
else
    echo "   ℹ️  Creating backend/.env from template..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "   ✅ Created backend/.env"
        echo "   ⚠️  You need to add API keys!"
    else
        echo "   ❌ .env.example not found"
        exit 1
    fi
fi

echo ""
echo "Step 2️⃣  Required API Keys"
echo ""
echo "   You need to add these to backend/.env:"
echo ""
echo "   📌 OPENAI_API_KEY:"
echo "      • Go to https://platform.openai.com/api/keys"
echo "      • Create new API key"
echo "      • Add to .env: OPENAI_API_KEY=sk-proj-..."
echo ""
echo "   📌 TAVILY_API_KEY (for web search):"
echo "      • Go to https://tavily.com/"
echo "      • Sign up free"
echo "      • Get API key from dashboard"
echo "      • Add to .env: TAVILY_API_KEY=tvly-..."
echo ""
echo "   ℹ️  Free tiers available for both services!"
echo ""

echo "Step 3️⃣  Dependencies"
# Check if npm is installed
if command -v npm &> /dev/null; then
    echo "   ✅ npm is installed"
    
    # Check if dependencies are installed
    if [ -d "backend/node_modules" ]; then
        echo "   ✅ Dependencies already installed"
    else
        echo "   📦 Installing dependencies..."
        cd backend
        npm install
        cd ..
        echo "   ✅ Dependencies installed"
    fi
else
    echo "   ❌ npm not found. Please install Node.js"
    exit 1
fi

echo ""
echo "Step 4️⃣  MongoDB"
if grep -q "MONGO_URI" backend/.env; then
    echo "   ✅ MongoDB URI configured"
else
    echo "   ⚠️  MongoDB URI not configured"
    echo "   • Use MongoDB Atlas (free: https://www.mongodb.com/cloud/atlas)"
    echo "   • Add to .env: MONGO_URI=mongodb+srv://..."
fi

echo ""
echo "=============================================="
echo "🚀 READY TO START!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add your API keys"
echo "2. Run: cd backend && npm start"
echo "3. Open frontend/index.html in browser"
echo "4. Chat with Tommy! 🤖"
echo ""
echo "📚 Full guide: Read TOMMY_SETUP_GUIDE.md"
echo ""
