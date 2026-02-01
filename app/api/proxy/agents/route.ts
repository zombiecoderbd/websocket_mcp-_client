import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { DatabaseConnection } from "@/lib/database"

// Advanced ZombieCoder Agent Implementation
class ZombieCoderAgent {
  private identity: any
  private personas: any
  private memory: Array<any>
  private currentPersona: string

  constructor() {
    this.loadIdentity();
    this.initializePersonas();
    this.memory = [];
    this.currentPersona = "professional";
  }

  private loadIdentity() {
    try {
      // Fallback to file
      const identityPath = path.join(process.cwd(), "identity.json")
      const identityData = fs.readFileSync(identityPath, "utf8")
      this.identity = JSON.parse(identityData)
    } catch (error) {
      // Final fallback identity
      this.identity = {
        system_identity: {
          name: "ZombieCoder",
          owner: "Sahon Srabon",
          organization: "Developer Zone",
          location: "Dhaka, Bangladesh"
        }
      }
    }
  }
  
  private async fetchIdentityFromDatabase() {
    try {
      const results: any[] = await DatabaseConnection.executeQuery(
        `SELECT setting_key, setting_value FROM system_settings 
         WHERE setting_key LIKE 'system_%'`
      );
      
      if (results && results.length > 0) {
        const identity: { system_identity: any } = { system_identity: {} };
        results.forEach((row: any) => {
          const key = row.setting_key.replace('system_', '');
          identity.system_identity[key] = row.setting_value;
        });
        
        // Ensure required fields exist
        identity.system_identity.name = identity.system_identity.name || "ZombieCoder";
        identity.system_identity.owner = identity.system_identity.owner || "Sahon Srabon";
        identity.system_identity.organization = identity.system_identity.organization || "Developer Zone";
        identity.system_identity.location = identity.system_identity.location || "Dhaka, Bangladesh";
        
        return identity;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching identity from database:", error);
      return null;
    }
  }

  private initializePersonas() {
    this.personas = {
      professional: {
        name: "Professional Developer",
        prefix: "ভাইয়া,",
        style: "technical_bengali",
        response_template: "ভাইয়া, {message} সম্পর্কে আমি বিস্তারিত ব্যাখ্যা করতে পারি।"
      },
      mentor: {
        name: "Supportive Mentor",
        prefix: "ভাইয়া,",
        style: "encouraging_bengali",
        response_template: "ভাইয়া, এটা খুবই গুরুত্বপূর্ণ বিষয়। আমি আপনাকে সাহায্য করতে পারি!"
      },
      technical: {
        name: "Technical Expert",
        prefix: "Technical Analysis:",
        style: "detailed_technical",
        response_template: "Technical approach for {message}:\n1. Problem identification\n2. Solution design\n3. Implementation\n4. Testing"
      }
    }
  }

  public async processMessage(message: string): Promise<string> {
    // Add to memory
    this.memory.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString()
    })

    // Check for identity queries
    if (this.isIdentityQuery(message)) {
      const response = this.getIdentityResponse()
      this.memory.push({
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString()
      })
      return response
    }

    // Fetch authentic contextual information from database
    const context = await this.getAuthenticContext(message);
    
    // Generate persona-based response
    const persona = this.personas[this.currentPersona]
    let response = persona.response_template.replace("{message}", message)
    
    // Add authentic contextual information
    if (context.length > 0) {
      response += "\n\nসম্পর্কিত তথ্য:\n" + context.join("\n")
    }

    // Add to memory
    this.memory.push({
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString()
    })

    return response
  }
  
  private async getAuthenticContext(message: string): Promise<string[]> {
    try {
      // Connect to database and fetch authentic context
      const results = await DatabaseConnection.executeQuery(
        `SELECT content, metadata FROM agent_memory 
         WHERE content_type IN ('knowledge', 'context') 
         AND (JSON_SEARCH(LOWER(content), 'one', LOWER(?)) IS NOT NULL 
              OR JSON_SEARCH(LOWER(JSON_EXTRACT(metadata, '$.tags')), 'one', LOWER(?)) IS NOT NULL)
         ORDER BY created_at DESC LIMIT 5`,
        [message.toLowerCase(), message.toLowerCase()]
      );
      
      if (Array.isArray(results) && results.length > 0) {
        return results.map((row: any) => row.content || row.summary || 'Related information');
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching authentic context:', error);
      // Return empty array if database fails
      return [];
    }
  }

  private isIdentityQuery(message: string): boolean {
    const identityKeywords = [
      "who are you", "who developed you", "who is your owner",
      "what is zombiecoder", "তুমি কে", "তোমার মালিক কে",
      "তুমি কেমন", "তোমার নাম কি"
    ]
    const messageLower = message.toLowerCase()
    return identityKeywords.some(keyword => messageLower.includes(keyword))
  }

  private getIdentityResponse(): string {
    const identity = this.identity.system_identity
    return `আমি ${identity.name}, যেখানে কোড ও কথা বলে। আমার নির্মাতা ও মালিক ${identity.owner}, ${identity.organization}।`
  }

  private getRelevantContext(message: string): string[] {
    const knowledgeBase = [
      "ZombieCoder হলো একটি লোকাল-ফার্স্ট এআই এসিস্ট্যান্ট যা দ্রুত কোড সমাধানের জন্য ডিজাইন করা হয়েছে।",
      "ব্যবহারকারীর সাথে যোগাযোগের জন্য প্রাথমিক ভাষা বাংলা। প্রযুক্তিগত কোড এবং বাস্তবায়ন বিস্তারিত ইংরেজিতে হবে।",
      "সমস্যা সমাধানের পদ্ধতি: ১. বিশ্লেষণ ও পুনরাবৃত্তি ২. বাধ্যতামূলক পরীক্ষা ৩. সর্বনিম্ন পরিবর্তনে সমাধান ৪. যাচাই ও পুনরাবৃত্তি ৫. প্রতিবেদন ও শিক্ষা"
    ]
    
    // Simple keyword matching
    const messageLower = message.toLowerCase()
    return knowledgeBase.filter(item => 
      item.toLowerCase().includes(messageLower) || 
      messageLower.includes("কোড") && item.includes("কোড") ||
      messageLower.includes("সমস্যা") && item.includes("সমস্যা")
    )
  }

  public switchPersona(personaName: string): string {
    if (this.personas[personaName]) {
      this.currentPersona = personaName
      return `✅ ${this.personas[personaName].name} পার্সোনায় স্যুইচ করা হয়েছে`
    } else {
      const available = Object.keys(this.personas).join(", ")
      return `❌ অবৈধ পার্সোনা। উপলব্ধ: ${available}`
    }
  }

  public getSystemStatus(): any {
    return {
      agent_name: "ZombieCoder",
      version: "1.0.0",
      owner: "Sahon Srabon",
      organization: "Developer Zone",
      current_persona: this.currentPersona,
      conversation_length: this.memory.length,
      identity_verified: true
    }
  }
}

// Global agent instance
let zombieCoderAgent: ZombieCoderAgent | null = null

function getAgent(): ZombieCoderAgent {
  if (!zombieCoderAgent) {
    zombieCoderAgent = new ZombieCoderAgent()
  }
  return zombieCoderAgent
}

export async function GET() {
  const agent = getAgent()
  const status = agent.getSystemStatus()
  
  return NextResponse.json({
    success: true,
    agent: status,
    message: "ZombieCoder Advanced Agent Active",
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const agent = getAgent()
    const body = await request.json()
    const { message, action } = body

    if (action === "switch_persona" && message) {
      const result = agent.switchPersona(message)
      return NextResponse.json({
        success: true,
        response: result,
        timestamp: new Date().toISOString()
      })
    }

    if (!message) {
      return NextResponse.json({
        success: false,
        error: "Message is required"
      }, { status: 400 })
    }

    const response = await agent.processMessage(message)
    
    return NextResponse.json({
      success: true,
      response: response,
      agent_status: agent.getSystemStatus(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[ZombieCoder Agent] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to process request"
    }, { status: 500 })
  }
}
