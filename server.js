const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { fallbackDatabase, keywordsDatabase } = require('./video');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// Trang chào mừng ở link gốc tránh lỗi Cannot GET /
app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV App đang hoạt động ngon lành cành đào rồi ông giáo ơi!");
});

// Hàm tự động cào dữ liệu nâng cấp (ĐÃ FIX: Thêm phân trang ngẫu nhiên tránh trùng lặp)
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu tiến trình cào dữ liệu...");
    let currentData = {};
    try {
        if (fs.existsSync(FILE_PATH)) {
            currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        }
    } catch (e) {
        currentData = {};
    }

    for (const [key, keywords] of Object.entries(keywordsDatabase)) {
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        try {
            // 🔥 CẢI TIẾN CHÍ MẠNG: Tự động nhảy trang ngẫu nhiên (Ví dụ: Trang 0, 10, 20, 30, 40)
            const randomCursor = Math.floor(Math.random() * 5) * 10; 
            
            console.log(`⏳ Đang cào cho mục [${key}] | Từ khóa: "${randomKeyword}" | Trang số (Cursor): ${randomCursor}`);
            
            // Đã thay thế cursor=0 cố định thành biến số trang ngẫu nhiên ${randomCursor}
            const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(randomKeyword)}&count=30&cursor=${randomCursor}`;
            
            const response = await axios.get(targetUrl, { 
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
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
                // Giữ lại tối đa 10 video cũ gần nhất để nhường chỗ cho rổ video mới
                const cleanOldList = oldList.slice(-10); 
                const mergedList = [...cleanOldList, ...fetchedVideos];
                
                const uniqueMap = new Map();
                mergedList.forEach(video => { if (video.video_id) uniqueMap.set(video.video_id, video); });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] tích lũy thành công! Kho đang có: ${currentData[key].length} video.`);
            }
        } catch (err) {
            console.log(`⚠️ Không cào được mục [${key}] do bên thứ ba chặn. Sẽ dùng kho dự phòng.`);
        }
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã đồng bộ kho dữ liệu mới vào file JSON!");
}

// Chạy cào tự động lúc khởi động
crawlAndSaveToJSON();

// 🔥 API CHÍNH: Trả dữ liệu mượt mà về cho Android Studio
app.get('/api/category', (req, res) => {
    const categoryKey = req.query.name || "hai_huoc";
    const count = parseInt(req.query.count) || 35; 

    try {
        let currentData = {};
        if (fs.existsSync(FILE_PATH)) {
            currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        }

        const liveVideos = currentData[categoryKey] || [];
        const fallbackVideos = fallbackDatabase[categoryKey] || [];

        // Gộp chung video cào được VÀ video cứu nguy để mảng dữ liệu luôn đầy đặn phong phú
        const mergedResult = [...liveVideos, ...fallbackVideos];

        // Xóa trùng ID nếu có
        const uniqueMap = new Map();
        mergedResult.forEach(v => uniqueMap.set(v.video_id, v));
        const finalPlayList = Array.from(uniqueMap.values());

        // Xáo trộn ngẫu nhiên danh sách để mỗi lần mở TV là một trải nghiệm mới
        const shuffledVideos = finalPlayList.sort(() => 0.5 - Math.random());
        
        return res.json({
            code: 0,
            msg: "success",
            data: shuffledVideos.slice(0, count)
        });
    } catch (e) {
        return res.json({ code: 0, msg: "success", data: fallbackDatabase[categoryKey] || [] });
    }
});

// Nút kích hoạt cào thêm bằng tay
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã chạy lệnh cào nâng cấp xới tung các trang TikTok rồi nhé ông giáo!");
});

app.listen(PORT, () => console.log(`🚀 Server chạy mượt mà tại cổng ${PORT}`));
