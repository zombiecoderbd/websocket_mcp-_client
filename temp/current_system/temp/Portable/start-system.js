#!/usr/bin/env node

// 🧟‍♂️ Port Conflict Solution Script
// পোর্ট কনফ্লিক্ট সমাধান এবং সিস্টেম স্টার্টার

const { exec } = require('child_process');
const fs = require('fs');

console.log('🧟‍♂️ জম্বিকোডার সিস্টেম - পোর্ট সমাধান');
console.log('===========================================');

// Check and kill processes on port 3000
console.log('🧹 পোর্ট 3000 পরিষ্কার করা হচ্ছে...');
exec('sudo fuser -k 3000/tcp', (error, stdout, stderr) => {
    if (error) {
        console.log('ℹ️  পোর্ট 3000 ইতিমধ্যে মুক্ত আছে');
    } else {
        console.log('✅ পোর্ট 3000 পরিষ্কার হয়েছে');
    }
    
    // Start the main system
    console.log('\n🚀 প্রধান সিস্টেম শুরু হচ্ছে...');
    exec('node zombiecoder-complete-startup.js', {
        cwd: '/home/sahon/admin/temp/Portable'
    });
    
    // Watch for completion and open dashboard
    setTimeout(() => {
        console.log('\n📋 পূর্ণ সিস্টেমের জন্য এই লিঙ্কগুলি পরীক্ষা করুন:');
        console.log('🏠 ফ্রন্টএন্ড (পোর্ট 3001): http://localhost:3001');
        console.log('🔧 ব্যাকএন্ড (পোর্ট 8000): http://localhost:8000');
        console.log('🤖 MCP অ্যাডমিন (পোর্ট 3002): http://localhost:3002/admin');
        console.log('📡 WebSocket (পোর্ট 8080): http://localhost:8080');
        console.log('📊 ড্যাশবোর্ড: file:///home/sahon/admin/temp/Portable/doc/index.html');
        
        // Open dashboard in browser
        exec('xdg-open /home/sahon/admin/temp/Portable/doc/index.html', (err) => {
            if (err) {
                console.log('ℹ️  ড্যাশবোর্ড স্বয়ংক্রিয়ভাবে ওপেন করতে ব্যর্থ, ম্যানুয়ালি ওপেন করুন');
            } else {
                console.log('✅ ড্যাশবোর্ড ব্রাউজারে ওপেন হয়েছে');
            }
        });
    }, 5000);
});