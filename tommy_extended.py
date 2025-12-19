import os
import sys
import json
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, Dict, List
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.memory import ConversationBufferMemory
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tommy.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class LMSTools:
    """Custom tools for LMS interactions"""
    
    @staticmethod
    def search_courses(query: str) -> str:
        """Search available courses by keyword"""
        courses_db = {
            "python": {
                "title": "Python Programming Fundamentals",
                "code": "PYTH101",
                "level": "beginner",
                "duration": "8 weeks",
                "instructor": "Dr. Sarah Chen"
            },
            "data science": {
                "title": "Data Science & Machine Learning",
                "code": "DS201",
                "level": "intermediate",
                "duration": "12 weeks",
                "instructor": "Prof. James Rodriguez"
            },
            "web development": {
                "title": "Full-Stack Web Development",
                "code": "WEB301",
                "level": "intermediate",
                "duration": "10 weeks",
                "instructor": "Ms. Lisa Anderson"
            },
            "mathematics": {
                "title": "Advanced Calculus & Linear Algebra",
                "code": "MATH401",
                "level": "advanced",
                "duration": "14 weeks",
                "instructor": "Prof. Michael Kim"
            }
        }
        
        query_lower = query.lower()
        results = []
        
        for key, course in courses_db.items():
            if key in query_lower or query_lower in course["title"].lower():
                results.append(f"**{course['title']}** (Code: {course['code']})\n"
                             f"• Level: {course['level']}\n"
                             f"• Duration: {course['duration']}\n"
                             f"• Instructor: {course['instructor']}")
        
        if results:
            return "Found courses:\n\n" + "\n\n".join(results)
        else:
            return f"No courses found for '{query}'. Try searching for: Python, Data Science, Web Development, or Mathematics."
    
    @staticmethod
    def get_assignment_deadlines() -> str:
        """Get upcoming assignment deadlines"""
        assignments = [
            {"title": "Python Assignment 1", "due": "2025-12-20", "course": "Python 101"},
            {"title": "Data Analysis Project", "due": "2025-12-25", "course": "Data Science"},
            {"title": "Web Design Task", "due": "2026-01-05", "course": "Web Dev"}
        ]
        
        result = "**Upcoming Assignments:**\n\n"
        for assign in assignments:
            result += f"📋 **{assign['title']}**\n"
            result += f"   Course: {assign['course']}\n"
            result += f"   Due: {assign['due']}\n\n"
        
        return result
    
    @staticmethod
    def get_enrollment_help() -> str:
        """Help with course enrollment"""
        return """**How to Enroll in a Course:**

1. **Search**: Use our course finder to search for courses that interest you
2. **View Details**: Check course description, duration, and difficulty level
3. **Check Prerequisites**: Make sure you meet any course requirements
4. **Enroll**: Click the enroll button - spaces available in most courses
5. **Access Materials**: Once enrolled, access course materials and assignments

**Benefits of Enrolling:**
✓ Full access to course materials and videos
✓ Participate in discussions
✓ Submit assignments
✓ Receive grades and feedback
✓ Get a certificate upon completion

Ask me "Show me Python courses" or "How long is the Web Development course?" to get started!"""
    
    @staticmethod
    def get_student_performance(student_id: str = "current") -> str:
        """Get student performance summary"""
        performance = {
            "gpa": "3.8",
            "courses_enrolled": 4,
            "courses_completed": 7,
            "average_grade": "A",
            "recent_grades": {
                "Python 101": "A+",
                "Data Science": "A",
                "Web Dev": "A-"
            }
        }
        
        result = f"**Your Academic Performance**\n\n"
        result += f"📊 GPA: {performance['gpa']}\n"
        result += f"📚 Enrolled Courses: {performance['courses_enrolled']}\n"
        result += f"✅ Completed Courses: {performance['courses_completed']}\n"
        result += f"📈 Average Grade: {performance['average_grade']}\n\n"
        result += "**Recent Grades:**\n"
        
        for course, grade in performance['recent_grades'].items():
            result += f"• {course}: {grade}\n"
        
        return result


class TommyAI:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.tavily_key = os.getenv("TAVILY_API_KEY")
        self.memory_file = "tommy_memory.json"
        self.conversation_history = []
        
        if not self.openai_key or not self.tavily_key:
            logger.error("Missing required API keys. Set OPENAI_API_KEY and TAVILY_API_KEY in .env")
            sys.exit(1)
        
        self.llm = None
        self.agent = None
        self.memory = None
        self.tools = []
        self.initialize_agent()
    
    def create_custom_tools(self) -> List[Tool]:
        """Create custom LMS tools"""
        tools = [
            Tool(
                name="Search Courses",
                func=LMSTools.search_courses,
                description="Search for available courses by keyword (e.g., 'python', 'data science')"
            ),
            Tool(
                name="Assignment Deadlines",
                func=lambda _: LMSTools.get_assignment_deadlines(),
                description="Get all upcoming assignment deadlines"
            ),
            Tool(
                name="Enrollment Help",
                func=lambda _: LMSTools.get_enrollment_help(),
                description="Get help with course enrollment process"
            ),
            Tool(
                name="Student Performance",
                func=LMSTools.get_student_performance,
                description="Get your academic performance summary and grades"
            )
        ]
        return tools
    
    def initialize_agent(self):
        try:
            logger.info("⚙️ Initializing Tommy AI Agent with Extended Capabilities...")
            
            self.llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0.7,
                api_key=self.openai_key,
                max_tokens=2048
            )
            
            web_search_tool = TavilySearchResults(
                max_results=3,
                api_key=self.tavily_key
            )
            
            custom_tools = self.create_custom_tools()
            
            self.tools = custom_tools + [web_search_tool]
            
            self.memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True
            )
            
            self.agent = initialize_agent(
                tools=self.tools,
                llm=self.llm,
                agent=AgentType.OPENAI_FUNCTIONS,
                memory=self.memory,
                verbose=False,
                handle_parsing_errors=True,
                max_iterations=5
            )
            
            logger.info("✅ Tommy AI Agent initialized with extended LMS capabilities")
            logger.info(f"Available tools: {[tool.name for tool in self.tools]}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            return False
    
    def load_conversation_history(self):
        try:
            if Path(self.memory_file).exists():
                with open(self.memory_file, 'r') as f:
                    self.conversation_history = json.load(f)
                logger.info(f"Loaded {len(self.conversation_history)} messages from history")
        except Exception as e:
            logger.warning(f"Could not load conversation history: {e}")
    
    def save_conversation_history(self):
        try:
            with open(self.memory_file, 'w') as f:
                json.dump(self.conversation_history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save conversation history: {e}")
    
    def process_message(self, user_input: str) -> str:
        try:
            if not self.agent:
                return "❌ Agent not initialized. Please restart."
            
            self.conversation_history.append({
                "role": "user",
                "content": user_input,
                "timestamp": datetime.now().isoformat()
            })
            
            response = self.agent.run(user_input)
            
            self.conversation_history.append({
                "role": "assistant",
                "content": response,
                "timestamp": datetime.now().isoformat()
            })
            
            self.save_conversation_history()
            return response
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return f"❌ Error: {str(e)}"
    
    def clear_history(self):
        self.conversation_history = []
        self.memory.clear()
        self.save_conversation_history()
        logger.info("Conversation history cleared")
    
    def run_interactive(self):
        logger.info("🟢 Tommy AI is online. Type 'exit', 'quit', 'help', or 'clear' to manage.")
        print("\n🤖 Tommy: Hi! I'm Tommy, your Advanced AI Assistant for the LMS!")
        print("💡 I can help you with:")
        print("   • 🔍 Search courses (e.g., 'Show me Python courses')")
        print("   • 📋 View assignment deadlines")
        print("   • 📚 Learn about course enrollment")
        print("   • 📊 Check your grades and performance")
        print("   • 🌐 Search the web for additional resources")
        print("-" * 60)
        
        while True:
            try:
                user_input = input("\n👤 You: ").strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ["exit", "quit"]:
                    print("\n🤖 Tommy: Goodbye! Your conversation was saved.")
                    logger.info("Session ended by user")
                    break
                
                if user_input.lower() == "clear":
                    self.clear_history()
                    print("🤖 Tommy: Conversation history cleared.")
                    continue
                
                if user_input.lower() == "help":
                    print("\n📚 Tommy Help:")
                    print("• 'search python' - Search for Python courses")
                    print("• 'deadlines' - Show assignment deadlines")
                    print("• 'enrollment' - Learn how to enroll")
                    print("• 'grades' - Check your performance")
                    print("• Any question - I'll try to answer using my knowledge or the web!")
                    continue
                
                response = self.process_message(user_input)
                print(f"\n🤖 Tommy: {response}")
                
            except KeyboardInterrupt:
                print("\n\n🤖 Tommy: Goodbye!")
                logger.info("Session interrupted by user")
                break
            except Exception as e:
                logger.error(f"Unexpected error in interactive mode: {e}")
                print(f"❌ Unexpected error: {e}")


def main():
    try:
        tommy = TommyAI()
        tommy.load_conversation_history()
        tommy.run_interactive()
    except Exception as e:
        logger.critical(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
