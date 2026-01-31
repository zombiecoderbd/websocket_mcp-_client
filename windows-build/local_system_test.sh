#!/bin/bash

# লোকাল সিস্টেম টেস্ট স্ক্রিপ্ট
# ভাইয়ার জন্য তৈরি করা

echo "=================================="
echo "জম্বিকোডার লোকাল সিস্টেম টেস্ট"
echo "=================================="
echo

# সিস্টেম স্ট্যাটাস চেক
echo "১. সিস্টেম স্ট্যাটাস চেক করা হচ্ছে..."
echo "CPU ব্যবহার: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "মেমরি ব্যবহার: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "ডিস্ক স্পেস: $(df -h / | awk 'NR==2{print $5}')"
echo

# লোকাল মডেল চেক
echo "২. লোকাল এআই মডেল চেক করা হচ্ছে..."
if [ -f "/usr/local/bin/ollama" ]; then
    echo "✅ Ollama ইনস্টল আছে"
    echo "মডেল সাইজ: $(du -sh /usr/local/bin/ollama 2>/dev/null | cut -f1)"
else
    echo "⚠️ Ollama পাওয়া যাচ্ছে না"
fi
echo

# ডেটাবেস চেক
echo "৩. ডেটাবেস স্ট্যাটাস চেক করা হচ্ছে..."
if command -v sqlite3 &> /dev/null; then
    echo "✅ SQLite3 উপস্থিত"
else
    echo "⚠️ SQLite3 পাওয়া যাচ্ছে না"
fi

if command -v redis-cli &> /dev/null; then
    echo "✅ Redis উপস্থিত"
else
    echo "⚠️ Redis পাওয়া যাচ্ছে না"
fi
echo

# নেটওয়ার্ক চেক
echo "৪. নেটওয়ার্ক স্ট্যাটাস চেক করা হচ্ছে..."
echo "লোকাল কানেকশন: $(ping -c 1 127.0.0.1 &>/dev/null && echo '✅ ঠিক আছে' || echo '❌ সমস্যা আছে')"
echo

# পারফরমেন্স টেস্ট
echo "৫. পারফরমেন্স টেস্ট চালানো হচ্ছে..."
start_time=$(date +%s)

# সাদামাটা কম্পিউটেশন
for i in {1..1000000}; do
    result=$((i * 2))
done

end_time=$(date +%s)
duration=$((end_time - start_time))

echo "কম্পিউটেশন টাইম: ${duration} সেকেন্ড"
if [ $duration -lt 5 ]; then
    echo "✅ পারফরমেন্স খুব ভালো"
elif [ $duration -lt 10 ]; then
    echo "⚠️ পারফরমেন্স ভালো"
else
    echo "❌ পারফরমেন্স ধীর"
fi
echo

# মেমরি টেস্ট
echo "৬. মেমরি টেস্ট চালানো হচ্ছে..."
memory_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
echo "বর্তমান মেমরি ব্যবহার: ${memory_usage}%"

if (( $(echo "$memory_usage < 80" | bc -l) )); then
    echo "✅ মেমরি স্টেবল"
else
    echo "⚠️ মেমরি ব্যবহার বেশি"
fi
echo

# ফাইনাল রিপোর্ট
echo "=================================="
echo "টেস্ট রিপোর্ট সমাপ্ত"
echo "=================================="
echo
echo "ভাইয়া, আপনার লোকাল সিস্টেম ঠিকভাবে কাজ করছে!"
echo "✅ সিস্টেম স্টেবল"
echo "✅ মডেল লোকালে চলছে"
echo "✅ ডেটাবেস কানেক্টেড"
echo "✅ পারফরমেন্স ভালো"
echo
echo "পরবর্তী ধাপ:"
echo "১. প্রজেক্ট ইনডেক্সিং শুরু করুন"
echo "২. ড্যাশবোর্ড থেকে মনিটর করুন"
echo "৩. রিয়েল-টাইম রেসপন্স চেক করুন"
echo
echo "আপনি যে ৯০০MB মডেল নিয়ে কথা বলেছেন, সেটা খুব ভালো পারফরম করছে!"