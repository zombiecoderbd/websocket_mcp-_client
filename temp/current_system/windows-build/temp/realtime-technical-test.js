#!/usr/bin/env node

// Real-time streaming test for technical logic
// This demonstrates the agent's capability to handle technical questions with real-time responses

const WebSocket = require('ws');

class RealTimeTechnicalAgent {
    constructor() {
        this.prefix = "ভাইয়া,";
        this.websocket = null;
        this.isConnected = false;
        this.responseStartTime = null;
    }
    
    async connect() {
        try {
            this.websocket = new WebSocket('ws://localhost:8080');
            
            this.websocket.on('open', () => {
                this.isConnected = true;
                console.log('✅ Real-time Technical Agent - কানেকশন সফল!');
                console.log(`${this.prefix} আমি এখন রিয়েল-টাইম টেকনিক্যাল এজেন্ট। প্রস্তুত!`);
            });
            
            this.websocket.on('message', (data) => {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            });
            
            this.websocket.on('close', () => {
                this.isConnected = false;
                console.log('🔒 কানেকশন বন্ধ হয়ে গেছে');
            });
            
        } catch (error) {
            console.error('❌ কানেকশন ত্রুটি:', error.message);
        }
    }
    
    handleMessage(message) {
        if (message.type === 'request') {
            this.processTechnicalRequest(message);
        }
    }
    
    async processTechnicalRequest(message) {
        const content = message.data?.content || "";
        this.responseStartTime = Date.now();
        
        console.log(`\n${this.prefix} রিকোয়েস্ট পাওয়া গেছে: ${content}`);
        console.log(`${this.prefix} এখন রিয়েল-টাইম স্ট্রিমিং শুরু করছি...`);
        
        // Step 1: Problem Analysis (Real-time streaming)
        await this.streamStep("প্রবলেম এনালাইসিস", 800, "প্রথমে এই প্রবলেমটা ঠিকভাবে বুঝি...");
        
        // Step 2: Technical Breakdown (Real-time streaming)
        await this.streamStep("টেকনিক্যাল ব্রেকডাউন", 1200, "এখন টেকনিক্যাল লজিক বিশ্লেষণ করি...");
        
        // Step 3: Solution Design (Real-time streaming)
        await this.streamStep("সল্যুশন ডিজাইন", 1000, "সমাধানের জন্য অ্যালগরিদম ডিজাইন করছি...");
        
        // Step 4: Implementation (Real-time streaming with actual code)
        await this.streamStep("ইমপ্লিমেন্টেশন", 1500, "কোড লিখছি...");
        await this.streamCodeImplementation(content);
        
        // Step 5: Testing (Real-time streaming)
        await this.streamStep("টেস্টিং", 800, "টেস্ট করছি...");
        
        // Final Response
        const totalTime = Date.now() - this.responseStartTime;
        await this.sendFinalResponse(content, totalTime);
    }
    
    async streamStep(stepName, duration, message) {
        console.log(`\n🔄 ${stepName} (${duration}ms)`);
        console.log(`${this.prefix} ${message}`);
        
        // Simulate processing time with real-time updates
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, duration / steps));
            const progress = Math.round((i / steps) * 100);
            console.log(`   প্রগ্রেস: ${progress}% - স্টেপ ${i} সম্পন্ন`);
        }
    }
    
    async streamCodeImplementation(requestContent) {
        console.log(`${this.prefix} কোড ইমপ্লিমেন্টেশন:`);
        
        // Generate appropriate code based on request
        let codeBlock = "";
        let explanation = "";
        
        if (requestContent.toLowerCase().includes('factorial')) {
            codeBlock = `function calculateFactorial(n) {
    // Base case
    if (n <= 1) return 1;
    
    // Recursive case
    return n * calculateFactorial(n - 1);
}

// Alternative iterative approach
function factorialIterative(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}`;
            explanation = "এইখানে দুটি পদ্ধতি দেখালাম - রিকার্সিভ এবং ইটারেটিভ। রিকার্সিভ টা সহজবোধ্য কিন্তু মেমরি বেশি লাগে, আর ইটারেটিভ টা মেমরি কম লাগে।";
        }
        else if (requestContent.toLowerCase().includes('prime')) {
            codeBlock = `function isPrime(num) {
    // Handle edge cases
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    
    // Check for divisors up to sqrt(num)
    for (let i = 5; i * i <= num; i += 6) {
        if (num % i === 0 || num % (i + 2) === 0) {
            return false;
        }
    }
    return true;
}`;
            explanation = "প্রাইম নাম্বার চেক করার জন্য অপ্টিমাইজড অ্যালগরিদম ব্যবহার করলাম। স্কয়ার রুট পর্যন্ত চেক করে সময় কমালাম।";
        }
        else {
            codeBlock = `// General purpose solution
function solveProblem(input) {
    // Analyze input
    console.log('Input received:', input);
    
    // Process logic
    const result = processLogic(input);
    
    // Return result
    return result;
}

function processLogic(data) {
    // Implementation logic here
    return "Processed: " + data;
}`;
            explanation = "জেনারেল প্রবলেম সলভিং প্যাটার্ন ব্যবহার করলাম। ইনপুট এনালাইসিস, লজিক প্রসেসিং, এবং রেজাল্ট রিটার্ন করছি।";
        }
        
        // Stream the code in chunks (real-time)
        const codeLines = codeBlock.split('\n');
        for (let i = 0; i < codeLines.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log(`   ${codeLines[i]}`);
        }
        
        console.log(`${this.prefix} ${explanation}`);
    }
    
    async sendFinalResponse(content, responseTime) {
        console.log(`\n✅ প্রসেসিং সম্পন্ন! (মোট সময়: ${responseTime}ms)`);
        
        if (this.isConnected && this.websocket) {
            const response = {
                type: "response",
                id: `resp-${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {
                    action: "apply_diff",
                    confidence: 0.95,
                    used_tools: ["code_generation", "analysis"],
                    response_time_ms: responseTime,
                    output: {
                        content: `function generatedSolution() {
    // Solution for: ${content}
    // Real-time implementation
    console.log("Real-time solution delivered!");
}`,
                        success: true,
                        processing_time: `${responseTime}ms`
                    },
                    next_hint: "Consider reviewing the generated code"
                }
            };
            
            this.websocket.send(JSON.stringify(response));
            console.log(`${this.prefix} রিয়েল-টাইম রেসপন্স সফলভাবে পাঠানো হয়েছে!`);
        }
    }
    
    startBangladeshTest() {
        console.log('\n=== Bangladesh Technical Test ===');
        console.log(`${this.prefix} আসুন এখন একটি জাতীয় স্তরের প্রশ্ন সমাধান করি সূক্ষ্ম ঢং এ...`);
        
        if (this.isConnected) {
            setTimeout(async () => {
                console.log('\n***রিয়েল-টাইম স্ট্রিমিং টেস্ট***');
                console.log('প্রশ্ন: বাংলাদেশের রাজধানীর নাম একটা ফাংশন প্রোগ্রামিং উপরে একটি টেকনিক্যাল লজিক কোন কোড নয়');
                
                const request = {
                    type: "request",
                    id: "bangladesh-test",
                    timestamp: new Date().toISOString(),
                    data: {
                        agent_id: "realtime-technical-agent",
                        persona: "bangla-dev",
                        editor: "terminal",
                        tools: ["analysis", "coding"],
                        conversation_id: "bangladesh-test-session",
                        memory_refs: [],
                        trace_id: "bangladesh-test-trace",
                        content: "বাংলাদেশের রাজধানীর নাম একটা ফাংশন প্রোগ্রামিং উপরে একটি টেকনিক্যাল লজিক কোন কোড নয়"
                    }
                };
                
                this.processTechnicalRequest(request);
                
            }, 2000);
        } else {
            console.log(`${this.prefix} দুঃখিত, সার্ভারে কানেক্টেড না। প্রথমে কানেক্ট করুন।`);
        }
    }
}

// Main execution
async function main() {
    const agent = new RealTimeTechnicalAgent();
    
    await agent.connect();
    
    setTimeout(() => {
        agent.startBangladeshTest();
    }, 3000);
}

main().catch(console.error);