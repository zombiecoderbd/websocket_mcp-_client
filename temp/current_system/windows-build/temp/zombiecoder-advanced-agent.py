#!/usr/bin/env python3
"""
ZombieCoder Advanced Agent with Identity Anchoring
Implementation following specified metadata and persona requirements
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

class IdentityManager:
    """Manages system identity and metadata anchoring"""
    
    def __init__(self, identity_file: str = "/home/sahon/admin/identity.json"):
        self.identity_file = identity_file
        self.identity_data = self._load_identity()
    
    def _load_identity(self) -> Dict:
        """Load identity from JSON file"""
        try:
            with open(self.identity_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load identity file: {e}")
            return self._get_default_identity()
    
    def _get_default_identity(self) -> Dict:
        """Return default identity if file cannot be loaded"""
        return {
            "system_identity": {
                "name": "ZombieCoder",
                "owner": "Sahon Srabon",
                "organization": "Developer Zone",
                "location": "Dhaka, Bangladesh"
            }
        }
    
    def get_identity_response(self) -> str:
        """Return standardized identity response"""
        identity = self.identity_data.get("system_identity", {})
        return f"আমি {identity.get('name', 'ZombieCoder')}, যেখানে কোড ও কথা বলে। আমার নির্মাতা ও মালিক {identity.get('owner', 'Sahon Srabon')}, {identity.get('organization', 'Developer Zone')}।"
    
    def get_full_identity(self) -> Dict:
        """Return complete identity information"""
        return self.identity_data

class PersonaManager:
    """Manages multiple agent personas with proper boundaries"""
    
    def __init__(self):
        self.personas = self._initialize_personas()
        self.current_persona = "professional"
        self.identity_manager = IdentityManager()
    
    def _initialize_personas(self) -> Dict[str, Dict]:
        """Initialize appropriate personas"""
        return {
            "professional": {
                "name": "Professional Developer",
                "prefix": "ভাইয়া,",
                "style": "technical_bengali",
                "description": "Formal, educational, technical approach",
                "response_template": "ভাইয়া, {message} সম্পর্কে আমি বিস্তারিত ব্যাখ্যা করতে পারি।"
            },
            "mentor": {
                "name": "Supportive Mentor", 
                "prefix": "ভাইয়া,",
                "style": "encouraging_bengali",
                "description": "Supportive, encouraging, patient approach",
                "response_template": "ভাইয়া, এটা খুবই গুরুত্বপূর্ণ বিষয়। আমি আপনাকে সাহায্য করতে পারি!"
            },
            "technical_expert": {
                "name": "Technical Expert",
                "prefix": "Technical Analysis:",
                "style": "detailed_technical",
                "description": "Deep technical analysis, code-focused approach",
                "response_template": "Technical approach for {message}:\n1. Problem identification\n2. Solution design\n3. Implementation\n4. Testing"
            }
        }
    
    def switch_persona(self, persona_name: str) -> bool:
        """Switch to specified persona"""
        if persona_name in self.personas:
            self.current_persona = persona_name
            return True
        return False
    
    def get_current_persona(self) -> Dict:
        """Get current persona configuration"""
        return self.personas.get(self.current_persona, self.personas["professional"])
    
    def generate_response(self, message: str) -> str:
        """Generate response using current persona"""
        persona = self.get_current_persona()
        template = persona["response_template"]
        
        # Apply persona template
        if "{message}" in template:
            response = template.format(message=message)
        else:
            response = f"{persona['prefix']} {message}"
        
        return response

class MemoryManager:
    """Manages conversation memory and context"""
    
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self.conversation_history = []
        self.context_buffer = {}
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """Add message to conversation history"""
        timestamp = datetime.now().isoformat()
        message_entry = {
            "role": role,
            "content": content,
            "timestamp": timestamp,
            "metadata": metadata or {}
        }
        
        self.conversation_history.append(message_entry)
        
        # Maintain history size
        if len(self.conversation_history) > self.max_history:
            self.conversation_history = self.conversation_history[-self.max_history:]
    
    def get_recent_context(self, count: int = 5) -> List[Dict]:
        """Get recent conversation context"""
        return self.conversation_history[-count:] if self.conversation_history else []
    
    def get_full_history(self) -> List[Dict]:
        """Get complete conversation history"""
        return self.conversation_history.copy()
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history.clear()

class RAGManager:
    """Manages Retrieval Augmented Generation capabilities"""
    
    def __init__(self, workspace_path: str = "/home/sahon/admin"):
        self.workspace_path = workspace_path
        self.knowledge_base = self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self) -> List[Dict]:
        """Initialize knowledge base from workspace"""
        knowledge = [
            {
                "topic": "ZombieCoder System",
                "content": "ZombieCoder is a local-first AI assistant designed for rapid code solutions and development assistance.",
                "category": "system_info"
            },
            {
                "topic": "Communication Protocol", 
                "content": "Primary communication language is Bengali for user interactions. Technical code and implementation details should be in English.",
                "category": "communication"
            },
            {
                "topic": "Problem Solving Process",
                "content": "Follow 5-step process: 1. Analyze & Repeat 2. Mandatory Testing 3. Solve with Minimalism 4. Verify & Regression 5. Report & Educate",
                "category": "process"
            }
        ]
        return knowledge
    
    def retrieve_relevant_knowledge(self, query: str) -> List[Dict]:
        """Retrieve relevant knowledge based on query"""
        # Simple keyword matching for demo
        relevant = []
        query_lower = query.lower()
        
        for item in self.knowledge_base:
            if any(keyword in item["content"].lower() or keyword in item["topic"].lower() 
                   for keyword in query_lower.split()):
                relevant.append(item)
        
        return relevant[:3]  # Return top 3 most relevant

class ZombieCoderAgent:
    """Main ZombieCoder Agent Implementation"""
    
    def __init__(self):
        self.identity_manager = IdentityManager()
        self.persona_manager = PersonaManager()
        self.memory_manager = MemoryManager()
        self.rag_manager = RAGManager()
        self.system_initialized = datetime.now()
    
    def process_message(self, user_message: str) -> str:
        """Process user message through complete pipeline"""
        try:
            # Step 1: Add to memory
            self.memory_manager.add_message("user", user_message)
            
            # Step 2: Check for identity queries
            if self._is_identity_query(user_message):
                response = self.identity_manager.get_identity_response()
            else:
                # Step 3: Retrieve relevant context
                context = self.rag_manager.retrieve_relevant_knowledge(user_message)
                
                # Step 4: Generate persona-based response
                response = self.persona_manager.generate_response(user_message)
                
                # Step 5: Enhance with context if available
                if context:
                    context_summary = "\n".join([f"- {item['topic']}: {item['content'][:100]}..." 
                                               for item in context])
                    response += f"\n\nRelated information:\n{context_summary}"
            
            # Step 6: Add response to memory
            self.memory_manager.add_message("assistant", response)
            
            return response
            
        except Exception as e:
            error_response = f"❌ Error processing your request: {str(e)}"
            self.memory_manager.add_message("assistant", error_response)
            return error_response
    
    def _is_identity_query(self, message: str) -> bool:
        """Check if message is asking about identity"""
        identity_keywords = [
            "who are you", "who developed you", "who is your owner", 
            "what is zombiecoder", "তুমি কে", "তোমার মালিক কে",
            "তুমি কেমন", "তোমার নাম কি"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in identity_keywords)
    
    def switch_persona(self, persona_name: str) -> str:
        """Switch agent persona"""
        success = self.persona_manager.switch_persona(persona_name)
        if success:
            current = self.persona_manager.get_current_persona()
            return f"✅ Switched to {current['name']} persona"
        else:
            available = ", ".join(self.persona_manager.personas.keys())
            return f"❌ Invalid persona. Available: {available}"
    
    def get_system_status(self) -> Dict:
        """Get complete system status"""
        return {
            "agent_name": "ZombieCoder",
            "version": "1.0.0",
            "owner": "Sahon Srabon",
            "organization": "Developer Zone",
            "current_persona": self.persona_manager.current_persona,
            "conversation_length": len(self.memory_manager.get_full_history()),
            "system_uptime": str(datetime.now() - self.system_initialized),
            "identity_verified": True
        }

def main():
    """Demonstration of the complete system"""
    print("🧟‍♂️ ZombieCoder Advanced Agent Initializing...")
    print("=" * 50)
    
    # Initialize agent
    agent = ZombieCoderAgent()
    
    # Display system status
    status = agent.get_system_status()
    print("System Status:")
    for key, value in status.items():
        print(f"  {key}: {value}")
    
    print("\n" + "=" * 50)
    print("Starting demonstration conversation...")
    
    # Test scenarios
    test_messages = [
        "Who are you?",
        "How do I fix a JavaScript memory leak?",
        "Can you explain MVC pattern?",
        "switch to mentor persona",
        "What's the best way to structure a React project?"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n--- Test {i} ---")
        print(f"User: {message}")
        
        if message.startswith("switch to"):
            persona = message.split()[-2]  # Extract persona name
            response = agent.switch_persona(persona)
        else:
            response = agent.process_message(message)
            
        print(f"Agent: {response}")
    
    print("\n" + "=" * 50)
    print("Conversation History Summary:")
    history = agent.memory_manager.get_full_history()
    print(f"Total messages: {len(history)}")
    
    if history:
        print("\nRecent exchanges:")
        for msg in history[-4:]:  # Show last 4 messages
            role = msg['role'].upper()
            content_preview = msg['content'][:80] + "..." if len(msg['content']) > 80 else msg['content']
            print(f"  {role}: {content_preview}")
    
    print("\n✅ Advanced agent demonstration completed!")

if __name__ == "__main__":
    main()