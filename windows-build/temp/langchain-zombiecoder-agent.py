#!/usr/bin/env python3
"""
ZombieCoder LangChain Agent Implementation
Advanced Multi-Persona AI Assistant with RAG and Memory
"""

import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

# LangChain imports
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# For demonstration - using a simple LLM wrapper
class SimpleLLM:
    """Simple LLM wrapper for demonstration purposes"""
    def __init__(self, model_name: str = "zombiecoder-base"):
        self.model_name = model_name
        self.persona = "professional"
        
    def invoke(self, messages: List[Dict]) -> str:
        # Simulate LLM response based on persona
        last_message = messages[-1] if messages else ""
        return self._generate_response(last_message, self.persona)
    
    def _generate_response(self, message: str, persona: str) -> str:
        """Generate response based on persona"""
        responses = {
            "professional": f"ভাইয়া, আমি ZombieCoder এজেন্ট। {message} সম্পর্কে আমি বিস্তারিত ব্যাখ্যা করতে পারি।",
            "friendly": f"হ্যালো ভাইয়া! কী ভাবছেন? {message} নিয়ে আমি সাহায্য করতে পারি!",
            "technical": f"Technical analysis: {message}\n\nImplementation approach:\n1. Problem identification\n2. Solution design\n3. Code implementation\n4. Testing verification"
        }
        return responses.get(persona, responses["professional"])

class ZombieCoderAgent:
    """Advanced ZombieCoder Agent with Multiple Personas and RAG"""
    
    def __init__(self, workspace_path: str = "/home/sahon/admin"):
        self.workspace_path = workspace_path
        self.llm = SimpleLLM()
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        self.personas = self._load_personas()
        self.current_persona = "professional"
        self.vector_store = None
        self._initialize_rag()
        
    def _load_personas(self) -> Dict[str, Dict]:
        """Load persona configurations"""
        return {
            "professional": {
                "name": "Professional Developer",
                "description": "Formal, technical, educational approach",
                "prefix": "ভাইয়া,",
                "style": "technical_bengali",
                "response_pattern": "analysis_first"
            },
            "friendly": {
                "name": "Friendly Mentor",
                "description": "Casual, encouraging, supportive",
                "prefix": "হ্যালো ভাইয়া!",
                "style": "conversational_bengali",
                "response_pattern": "encouragement_first"
            },
            "technical": {
                "name": "Code Architect",
                "description": "Deep technical analysis, pattern-focused",
                "prefix": "Technical perspective:",
                "style": "code_first",
                "response_pattern": "architecture_first"
            }
        }
    
    def _initialize_rag(self):
        """Initialize RAG system with workspace documents"""
        try:
            # Create embeddings
            embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            
            # Load and process workspace documents
            documents = self._load_workspace_documents()
            
            if documents:
                # Split documents
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200
                )
                splits = text_splitter.split_documents(documents)
                
                # Create vector store
                self.vector_store = Chroma.from_documents(
                    splits, 
                    embeddings,
                    persist_directory=f"{self.workspace_path}/chroma_db"
                )
                print("✅ RAG system initialized with workspace documents")
            else:
                print("⚠️ No documents found for RAG initialization")
                
        except Exception as e:
            print(f"❌ RAG initialization failed: {e}")
    
    def _load_workspace_documents(self) -> List[Any]:
        """Load documents from workspace for RAG"""
        documents = []
        # This would load actual documents from the workspace
        # For demo, creating mock documents
        mock_docs = [
            "ZombieCoder is a development assistant that helps with coding tasks",
            "The system uses local-first approach with no external dependencies",
            "Bangla communication is preferred for user interactions",
            "Technical code should be written in English",
            "The agent follows 5-step problem solving process"
        ]
        
        # In real implementation, this would load actual files
        for doc in mock_docs:
            documents.append(type('Document', (), {
                'page_content': doc,
                'metadata': {'source': 'workspace_knowledge'}
            })())
            
        return documents
    
    def switch_persona(self, persona_name: str) -> bool:
        """Switch to different persona"""
        if persona_name in self.personas:
            self.current_persona = persona_name
            self.llm.persona = persona_name
            return True
        return False
    
    def get_available_personas(self) -> List[str]:
        """Get list of available personas"""
        return list(self.personas.keys())
    
    def process_message(self, user_message: str) -> str:
        """Process user message with current persona and RAG"""
        try:
            # Add to memory
            self.memory.chat_memory.add_user_message(user_message)
            
            # Get relevant context from RAG
            context = ""
            if self.vector_store:
                retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})
                docs = retriever.get_relevant_documents(user_message)
                context = "\n".join([doc.page_content for doc in docs])
            
            # Generate response based on current persona
            persona_config = self.personas[self.current_persona]
            prefix = persona_config["prefix"]
            
            # Create prompt with context and persona
            prompt = f"""{prefix} {user_message}

Context information:
{context}

Current persona: {persona_config['name']}
Response style: {persona_config['style']}

Please respond appropriately:"""
            
            # Get LLM response
            response = self.llm.invoke([{"role": "user", "content": prompt}])
            
            # Add to memory
            self.memory.chat_memory.add_ai_message(response)
            
            return response
            
        except Exception as e:
            return f"❌ Error processing message: {str(e)}"
    
    def get_conversation_history(self) -> List[Dict]:
        """Get conversation history"""
        return [
            {"role": msg.type, "content": msg.content}
            for msg in self.memory.chat_memory.messages
        ]
    
    def clear_memory(self):
        """Clear conversation memory"""
        self.memory.clear()
        print("✅ Conversation memory cleared")

def main():
    """Main function to demonstrate the agent"""
    print("🧟‍♂️ ZombieCoder LangChain Agent Initializing...")
    
    # Initialize agent
    agent = ZombieCoderAgent()
    
    print("\nAvailable Personas:")
    for persona in agent.get_available_personas():
        print(f"  - {persona}: {agent.personas[persona]['name']}")
    
    print("\n🎯 Starting conversation demo...")
    
    # Demo conversation
    test_messages = [
        "How do I fix a memory leak in my JavaScript application?",
        "Can you explain the MVC pattern?",
        "What's the best way to structure a React project?"
    ]
    
    for i, message in enumerate(test_messages):
        print(f"\n--- Message {i+1} ---")
        print(f"User: {message}")
        
        response = agent.process_message(message)
        print(f"Agent: {response}")
        
        # Switch persona for variety
        if i == 1:
            agent.switch_persona("friendly")
            print("🔄 Switched to friendly persona")
    
    print("\n📊 Conversation History:")
    history = agent.get_conversation_history()
    for msg in history:
        print(f"{msg['role'].upper()}: {msg['content'][:100]}...")
    
    print("\n✅ Agent demonstration completed!")

if __name__ == "__main__":
    main()