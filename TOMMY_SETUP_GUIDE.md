# Tommy AI Assistant - Setup Guide

## Overview

Tommy is now upgraded to be a **general-purpose AI assistant** capable of answering any question like ChatGPT or Gemini, including:

- 🧠 General knowledge and explanations
- 💻 Code writing, debugging, and technical help
- 📚 Learning and educational support
- 🔍 Web search for current information
- 🎨 Creative writing and brainstorming
- 📊 Data analysis and problem solving
- And much more!

## Features

### ✅ Enabled by Default
- **Local Knowledge Base**: Answers LMS-related questions offline
- **Conversation Memory**: Remembers chat history within a session
- **Persistent Storage**: Saves conversations to MongoDB
- **Multi-user Support**: Different chat sessions per user
- **Error Handling**: Smart fallbacks and retry mechanisms

### 🔧 Requires Configuration
- **Full AI Capabilities**: Web search + advanced reasoning
- **Current Events**: Real-time information lookup
- **Advanced Analysis**: Complex problem solving with web context

## Setup Instructions

### Step 1: Clone/Update Environment Variables

Copy the example file and configure it:

```bash
cp backend/.env.example backend/.env
```

### Step 2: Get OpenAI API Key

Tommy uses GPT-4o for advanced AI capabilities.

1. **Go to OpenAI Platform**: https://platform.openai.com/api/keys
2. **Sign up** (free trial available, $5 free credits)
3. **Create API Key**
4. **Copy your key**
5. **Paste in `.env` file**:
   ```
   OPENAI_API_KEY=sk-proj-your_actual_key_here
   ```

**Free Tier**: Get $5 free credits monthly to start

### Step 3: Get Tavily Search API Key (Optional but Recommended)

For web search and current information:

1. **Go to Tavily**: https://tavily.com/
2. **Sign up** (free account available)
3. **Get API key** from dashboard
4. **Paste in `.env` file**:
   ```
   TAVILY_API_KEY=tvly-your_actual_key_here
   ```

**Free Tier**: 1,000 API calls/month

### Step 4: Configure MongoDB

Ensure you have a valid MongoDB connection string:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### Step 5: Restart Backend

```bash
cd backend
npm start
```

Server will start on port 5000 (or your configured PORT).

## Testing Tommy

### Test Local Mode (No API Keys Required)

Open `frontend/index.html` and ask:
- "What are the Bronze features?"
- "Tell me about the LMS"
- "What courses are available?"

These work **without** OpenAI/Tavily keys (using local knowledge base).

### Test Full AI Mode (API Keys Required)

Ask general questions:
- "Explain quantum computing"
- "Write Python code to sort a list"
- "What's the latest AI news?"
- "Help me debug this JavaScript error"
- "How do I improve my essay writing?"

## API Endpoints

### Chat Endpoint
```
POST /api/tommy/chat
Content-Type: application/json

{
  "message": "Your question here",
  "userId": "user_id_optional",
  "userRole": "student|teacher",
  "includeWebSearch": true
}
```

**Response**:
```json
{
  "response": "Tommy's answer",
  "sessionId": "session_id",
  "timestamp": "2025-12-12T...",
  "model": "gpt-4o",
  "webSearchEnabled": true
}
```

### Get Chat History
```
GET /api/tommy/history/:userId
Authorization: Bearer <token>
```

### Clear Chat History
```
DELETE /api/tommy/history/:userId
Authorization: Bearer <token>
```

### Search Courses (LMS-Specific)
```
GET /api/tommy/search-courses?query=python&role=student
```

### Get Upcoming Assignments
```
GET /api/tommy/upcoming-assignments
Authorization: Bearer <token>
```

## Configuration Options

### Model Selection

Change the OpenAI model in `.env`:

```bash
OPENAI_MODEL=gpt-4o          # Best (default)
OPENAI_MODEL=gpt-4-turbo     # Faster alternative
OPENAI_MODEL=gpt-3.5-turbo   # Budget option
```

### Temperature & Creativity

Edit `backend/server.js` in the ChatOpenAI configuration:

```javascript
const model = new ChatOpenAI({
    temperature: 0.8,           // 0-1: higher = more creative
    topP: 0.95,                 // Nucleus sampling
    frequencyPenalty: 0.5,      // Reduce repetition
    presencePenalty: 0.5,       // Encourage new topics
    maxTokens: 4096             // Max response length
});
```

## Python Scripts

### CLI Version: `tommy.py`
Basic command-line AI assistant:
```bash
python3 tommy.py
```

Features:
- Interactive CLI
- Local memory with JSON persistence
- Error logging
- Conversation history

### Extended Version: `tommy_extended.py`
LMS-integrated AI with built-in tools:
```bash
python3 tommy_extended.py
```

Features:
- Course search tool
- Assignment tracking
- Enrollment help
- Performance summaries
- Web search integration

## Troubleshooting

### "Tommy service not fully configured"
**Solution**: Add `OPENAI_API_KEY` and `TAVILY_API_KEY` to `.env`

### "Connection Issue" in Chat Widget
**Solution**: 
1. Check backend is running: `npm start` in `backend/` folder
2. Verify `.env` has correct `PORT` (default 5000)
3. Check MongoDB connection string

### API Rate Limiting
- **OpenAI**: ~3,500 RPM (free tier)
- **Tavily**: 1,000 calls/month (free)
- **Solution**: Upgrade plan or add delays between requests

### Web Search Not Working
- Check `TAVILY_API_KEY` is valid
- Ensure query format is clear
- Try simpler search terms

## Advanced Features

### Multi-Turn Conversations
Tommy remembers previous messages in a session:
```
User: "Explain neural networks"
Tommy: [explanation]
User: "Can you give me code example?" (refers to previous context)
Tommy: [code with context from previous message]
```

### Role-Based Context
Tommy adapts responses based on user role:
- **Teachers**: Professional, curriculum-focused
- **Students**: Educational, learning-focused

### Persistent History
All conversations saved to MongoDB:
- Retrieve later with `/api/tommy/history/:userId`
- Clear with `/api/tommy/history/:userId` (DELETE)

## Limitations & Notes

1. **Context Window**: Max ~4,096 tokens per response (about 3,000 words)
2. **Web Search**: Returns top 5 results
3. **Real-time**: Web search is only as current as search engine index
4. **Accuracy**: AI responses should be verified for critical information
5. **Cost**: OpenAI charges per token after free credits

## Cost Estimates (Monthly)

Assuming ~100 messages/day, 30-day month:

| Model | Tokens | Cost |
|-------|--------|------|
| gpt-4o | ~500k | ~$2-3 |
| gpt-4-turbo | ~500k | ~$1.50 |
| gpt-3.5-turbo | ~500k | ~$0.15 |

**Plus Tavily**: ~$0-5 depending on searches

## Support

- **OpenAI Documentation**: https://platform.openai.com/docs
- **Tavily API Docs**: https://docs.tavily.com
- **LangChain Docs**: https://js.langchain.com

## Next Steps

1. ✅ Clone `.env.example` → `.env`
2. ✅ Add API keys
3. ✅ Restart backend
4. ✅ Test with sample questions
5. ✅ Customize prompts/models as needed

---

**Tommy is now ready to answer virtually any question!** 🚀
