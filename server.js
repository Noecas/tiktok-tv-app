const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 🔥 ĐÂY RỒI: Nhập khẩu dữ liệu gọn gàng từ file video.js sang
const { fallbackDatabase, keywordsDatabase } = require('./video');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// Khởi tạo file JSON bằng kho dữ liệu cứu nguy ban đầu
if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(fallbackDatabase, null, 2));
}

// Trang chào mừng ở link gốc tránh lỗi Cannot GET /
app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV App đang hoạt động ngon lành cành đào rồi ông giáo ơi!");
});

// Hàm tự động cào dữ liệu nâng cấp (Bẻ khóa 403)
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu cào dữ liệu tích lũy...");
    let currentData = {};
    try {
        currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        currentData = { ...fallbackDatabase };
    }

    for (const [key, keywords] of Object.entries(keywordsDatabase)) {
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        try {
            console.log(`⏳ Đang cào cho mục [${key}] bằng từ khóa: "${randomKeyword}"`);
            const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(randomKeyword)}&count=50&cursor=0`;
            
            const response = await axios.get(targetUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos) && response.data.data.videos.length > 0) {
                const fetchedVideos = response.data.data.videos.map(v => ({
                    video_id: v.video_id,
                    play: v.play,
                    title: v.title || "Video TikTok thú vị",
                    cover: v.cover,
                    play_count: v.play_count || 0,
                    author: { nickname: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user" },
                    music_info: { title: v.music_info?.title || "Âm thanh gốc" }
                }));

                const oldList = currentData[key] || [];
                const mergedList = [...oldList, ...fetchedVideos];
                const uniqueMap = new Map();
                mergedList.forEach(video => { if (video.video_id) uniqueMap.set(video.video_id, video); });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] cào thành công! Kho đang tích lũy: ${currentData[key].length} video.`);
            } else {
                if (!currentData[key] || currentData[key].length === 0) currentData[key] = fallbackDatabase[key];
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]: ${err.message}. Kích hoạt kho cứu nguy.`);
            if (!currentData[key] || currentData[key].length === 0) currentData[key] = fallbackDatabase[key];
        }
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
}

// Bật server lên là tự động cào đợt đầu luôn
crawlAndSaveToJSON();

// API chính trả dữ liệu về cho Android Studio
app.get('/api/category', (req, res) => {
    const categoryKey = req.query.name || "hai_huoc";
    const count = parseInt(req.query.count) || 35; 

    try {
        let currentData = {};
        if (fs.existsSync(FILE_PATH)) {
            currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        } else {
            currentData = { ...fallbackDatabase };
        }

        let allVideos = currentData[categoryKey] || [];
        if (allVideos.length === 0) allVideos = fallbackDatabase[categoryKey] || [];

        const shuffledVideos = [...allVideos].sort(() => 0.5 - Math.random());
        return res.json({ code: 0, msg: "success", data: shuffledVideos.slice(0, count) });
    } catch (e) {
        return res.status(500).json({ code: -1, msg: e.message, data: [] });
    }
});

// Nút kích hoạt cào thêm bằng tay
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã chạy lệnh cào nâng cấp chống chặn 403 rồi nhé ông giáo!");
});

app.listen(PORT, () => console.log(`🚀 Server chạy mượt mà tại cổng ${PORT}`));
