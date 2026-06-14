const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Nhập khẩu dữ liệu gọn gàng từ file video.js sang
const { fallbackDatabase, keywordsDatabase } = require('./video');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// Khởi tạo file JSON bằng kho dữ liệu cứu nguy ban đầu (Đã sửa lỗi tự tạo ID)
if (!fs.existsSync(FILE_PATH)) {
    const initializedData = {};
    Object.keys(fallbackDatabase).forEach(key => {
        initializedData[key] = fallbackDatabase[key].map((v, i) => ({
            ...v,
            video_id: v.video_id || `${key}_init_${i}_${Math.random().toString(36).substr(2, 5)}`
        }));
    });
    fs.writeFileSync(FILE_PATH, JSON.stringify(initializedData, null, 2));
}

// Trang chào mừng ở link gốc tránh lỗi Cannot GET /
app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV App đang hoạt động ngon lành cành đào rồi ông giáo ơi!");
});

// Hàm tự động cào dữ liệu nâng cấp (ĐÃ FIX LỖI LỌC TRÙNG NUỐT VIDEO)
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu cào dữ liệu tích lũy...");
    let currentData = {};
    try {
        currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        currentData = {};
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
                
                // 🔥 SỬA LỖI CHÍ MẠNG TẠI ĐÂY: Cấp ID thông minh, không lo bị đè bẹp dí còn 1 video
                const uniqueMap = new Map();
                mergedList.forEach((video, index) => {
                    const idToSave = video.video_id || `${key}_auto_${index}_${Math.random().toString(36).substr(2, 5)}`;
                    video.video_id = idToSave;
                    uniqueMap.set(idToSave, video);
                });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] cào thành công! Kho đang tích lũy thực tế: ${currentData[key].length} video.`);
            } else {
                // Nếu API lỗi/trống, nạp dữ liệu cứu nguy bọc lót khẩn cấp
                if (!currentData[key] || currentData[key].length === 0) {
                    currentData[key] = fallbackDatabase[key].map((v, i) => ({
                        ...v,
                        video_id: v.video_id || `${key}_fb_${i}_${Math.random().toString(36).substr(2, 3)}`
                    }));
                }
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]: ${err.message}. Kích hoạt kho cứu nguy.`);
            if (!currentData[key] || currentData[key].length === 0) {
                currentData[key] = fallbackDatabase[key].map((v, i) => ({
                    ...v,
                    video_id: v.video_id || `${key}_fberr_${i}_${Math.random().toString(36).substr(2, 3)}`
                }));
            }
        }
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã ghi toàn bộ video sạch sẽ vào file JSON!");
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
            currentData = {};
        }

        let allVideos = currentData[categoryKey] || [];
        
        // Nếu bộ nhớ trống rỗng, lấy dữ liệu cứu nguy ngay lập tức
        if (allVideos.length === 0) {
            allVideos = fallbackDatabase[categoryKey] || [];
        }

        // Thuật toán xáo trộn ngẫu nhiên để nội dung trên TV luôn mới mẻ
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
