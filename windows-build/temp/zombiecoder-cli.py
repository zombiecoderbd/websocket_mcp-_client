#!/usr/bin/env python3
"""
ZombieCoder Agent CLI Interface
Direct integration with the advanced agent
"""

import requests
import json
import sys
from typing import Optional

class ZombieCoderCLI:
    def __init__(self, base_url: str = "http://localhost:3001/api/proxy/agents"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def get_agent_status(self) -> Optional[dict]:
        """Get current agent status"""
        try:
            response = self.session.get(self.base_url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Error getting agent status: {e}")
            return None
    
    def send_message(self, message: str) -> Optional[str]:
        """Send message to agent"""
        try:
            payload = {"message": message}
            response = self.session.post(self.base_url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response") if data.get("success") else None
        except Exception as e:
            print(f"❌ Error sending message: {e}")
            return None
    
    def switch_persona(self, persona: str) -> bool:
        """Switch agent persona"""
        try:
            payload = {"message": persona, "action": "switch_persona"}
            response = self.session.post(self.base_url, json=payload)
            response.raise_for_status()
            data = response.json()
            if data.get("success"):
                print(f"✅ {data.get('response')}")
                return True
            return False
        except Exception as e:
            print(f"❌ Error switching persona: {e}")
            return False
    
    def display_status(self):
        """Display current agent status"""
        status = self.get_agent_status()
        if status and status.get("success"):
            agent = status["agent"]
            print("\n🧟‍♂️ ZombieCoder Agent Status")
            print("=" * 40)
            print(f"নাম: {agent['agent_name']}")
            print(f"সংস্করণ: {agent['version']}")
            print(f"মালিক: {agent['owner']}")
            print(f"প্রতিষ্ঠান: {agent['organization']}")
            print(f"বর্তমান পার্সোনা: {agent['current_persona']}")
            print(f"কথোপকথন দৈর্ঘ্য: {agent['conversation_length']}")
            print(f"পরিচয় যাচাই: {'✅' if agent['identity_verified'] else '❌'}")
            print("=" * 40)
        else:
            print("❌ Could not retrieve agent status")
    
    def interactive_mode(self):
        """Run interactive chat mode"""
        print("🧟‍♂️ ZombieCoder Advanced Agent - Interactive Mode")
        print("Type 'quit' to exit, 'status' for status, 'persona <name>' to switch")
        print("Available personas: professional, mentor, technical")
        print("-" * 50)
        
        while True:
            try:
                user_input = input("\nআপনি: ").strip()
                
                if not user_input:
                    continue
                    
                if user_input.lower() == 'quit':
                    print("👋 আবার দেখা হবে!")
                    break
                    
                elif user_input.lower() == 'status':
                    self.display_status()
                    
                elif user_input.lower().startswith('persona '):
                    persona = user_input.split(' ', 1)[1]
                    self.switch_persona(persona)
                    
                else:
                    response = self.send_message(user_input)
                    if response:
                        print(f"\n🤖 এজেন্ট: {response}")
                    else:
                        print("❌ Failed to get response")
                        
            except KeyboardInterrupt:
                print("\n\n👋 আবার দেখা হবে!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

def main():
    """Main function"""
    cli = ZombieCoderCLI()
    
    if len(sys.argv) > 1:
        # Command line mode
        command = sys.argv[1]
        
        if command == "status":
            cli.display_status()
            
        elif command == "send" and len(sys.argv) > 2:
            message = " ".join(sys.argv[2:])
            response = cli.send_message(message)
            if response:
                print(f"🤖 {response}")
            else:
                print("❌ Failed to send message")
                
        elif command == "persona" and len(sys.argv) > 2:
            persona = sys.argv[2]
            cli.switch_persona(persona)
            
        else:
            print("Usage:")
            print("  python3 zombiecoder-cli.py status")
            print("  python3 zombiecoder-cli.py send <message>")
            print("  python3 zombiecoder-cli.py persona <persona_name>")
            print("  python3 zombiecoder-cli.py  # Interactive mode")
    else:
        # Interactive mode
        cli.interactive_mode()

if __name__ == "__main__":
    main()