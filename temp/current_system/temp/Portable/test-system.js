// 🧟‍♂️ System Verification Test
// সিস্টেম ভেরিফিকেশন টেস্ট

const http = require('http');

console.log('🧟‍♂️ জম্বিকোডার সিস্টেম ভেরিফিকেশন');
console.log('====================================');

const services = [
    { name: 'ফ্রন্টএন্ড', port: 3001, path: '/' },
    { name: 'ব্যাকএন্ড', port: 8000, path: '/health' },
    { name: 'MCP অ্যাডমিন', port: 3002, path: '/api/health' },
    { name: 'WebSocket', port: 8080, path: '/' }
];

async function checkService(service) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: service.port,
            path: service.path,
            method: 'GET',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            resolve({
                name: service.name,
                port: service.port,
                status: '✅ সক্রিয়',
                statusCode: res.statusCode
            });
        });

        req.on('error', (error) => {
            resolve({
                name: service.name,
                port: service.port,
                status: '❌ নিষ্ক্রিয়',
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: service.name,
                port: service.port,
                status: '⏰ টাইমআউট',
                error: 'Connection timeout'
            });
        });

        req.end();
    });
}

async function runVerification() {
    console.log('\n🔍 সার্ভিস স্ট্যাটাস চেক করা হচ্ছে...\n');
    
    const results = [];
    for (const service of services) {
        const result = await checkService(service);
        results.push(result);
        console.log(`${result.name} (পোর্ট ${result.port}): ${result.status}`);
        if (result.error) {
            console.log(`   ত্রুটি: ${result.error}`);
        }
    }

    console.log('\n📊 সম্পূর্ণ রিপোর্ট:');
    console.log('====================');
    results.forEach(result => {
        console.log(`${result.name}: ${result.status}`);
    });

    const activeServices = results.filter(r => r.status.includes('সক্রিয়')).length;
    console.log(`\n🎯 সক্রিয় সার্ভিস: ${activeServices}/${services.length}`);
    
    if (activeServices === services.length) {
        console.log('🎉 সকল সার্ভিস সফলভাবে চলছে!');
    } else {
        console.log('⚠️  কিছু সার্ভিস সক্রিয় নয়, সিস্টেম রিস্টার্ট করুন');
    }
}

// Run verification
runVerification();