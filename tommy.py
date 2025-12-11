import os
import json
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults

# --- CONFIGURATION ---
# 🔴 IMPORTANT: Paste your NEW, fresh keys here.
os.environ["OPENAI_API_KEY"] = "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"
os.environ["TAVILY_API_KEY"] = "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"

# 1. THE BRAIN
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# 2. THE EYES (Tools)
search_tool = TavilySearchResults(max_results=3)
tools = [search_tool]

# Bind tools to LLM
llm_with_tools = llm.bind_tools(tools)

print("⚙️  Initializing Tommy...")
print("🟢 Tommy is online. Type 'exit' to stop.")
print("------------------------------------------")

# --- THE CHAT LOOP ---
conversation_history = []

while True:
    try:
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit"]:
            print("Tommy: Goodbye!")
            break
        
        conversation_history.append({"role": "user", "content": user_input})
        response = llm_with_tools.invoke(conversation_history)
        
        if response.content:
            print(f"Tommy: {response.content}\n")
            conversation_history.append({"role": "assistant", "content": response.content})
        
    except Exception as e:
        print(f"❌ Error: {e}")