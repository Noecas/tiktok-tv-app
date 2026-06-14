const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { fallbackDatabase, keywordsDatabase } = require('./video');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV App đang chạy ở chế độ MỘT KHO VIDEO CHUNG DUY NHẤT!");
});

// Hàm cào dữ liệu: Tìm được gì là vứt hết vào một mảng phẳng duy nhất
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu tiến trình cào dữ liệu gom về một mối...");
    let currentVideos = [];
    
    try {
        if (fs.existsSync(FILE_PATH)) {
            const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
            currentVideos = JSON.parse(fileContent);
            if (!Array.isArray(currentVideos)) currentVideos = [];
        }
    } catch (e) {
        currentVideos = [];
    }

    // 🔥 ĐOẠN SỬA LỖI: Tự động tương thích cả cấu trúc từ khóa cũ và mới để KHÔNG BAO GIỜ SẬP
    let flatKeywords = [];
    if (Array.isArray(keywordsDatabase)) {
        flatKeywords = keywordsDatabase; // Nếu là mảng mới
    } else if (keywordsDatabase && typeof keywordsDatabase === 'object') {
        flatKeywords = Object.values(keywordsDatabase).flat(); // Nếu vẫn là object cũ, tự đập phẳng ra mảng
    }

    if (flatKeywords.length === 0) {
        console.log("⚠️ [CẢNH BÁO] Không tìm thấy từ khóa nào để cào dữ liệu!");
        return;
    }

    // Chọn ngẫu nhiên 4 từ khóa trong kho phẳng để đi quét mỗi lần
    const selectedKeywords = [...flatKeywords].sort(() => 0.5 - Math.random()).slice(0, 4);

    for (const keyword of selectedKeywords) {
        try {
            const randomCursor = Math.floor(Math.random() * 6) * 10; 
            console.log(`⏳ Đang quét từ khóa: "${keyword}" | Trang: ${randomCursor}`);
            
            const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=25&cursor=${randomCursor}`;
            
            const response = await axios.get(targetUrl, { 
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                const fetched = response.data.data.videos.map(v => ({
                    video_id: v.video_id,
                    play: v.play,
                    title: v.title || "Video TikTok thú vị",
                    cover: v.cover,
                    play_count: v.play_count || 0,
                    author: { nickname: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user" },
                    music_info: { title: v.music_info?.title || "Âm thanh gốc" }
                }));

                // Ném thẳng vào mảng chung
                currentVideos = [...currentVideos, ...fetched];
            }
        } catch (err) {
            console.log(`⚠️ Lỗi cào từ khóa [${keyword}]: ${err.message}`);
        }
    }

    // Lọc trùng ID video trong rổ chung
    const uniqueMap = new Map();
    currentVideos.forEach(v => { if (v.video_id) uniqueMap.set(v.video_id, v); });
    
    // Giữ lại tối đa 150 video mới nhất để kho luôn mượt, tránh nặng server
    const finalResult = Array.from(uniqueMap.values()).slice(-150);

    fs.writeFileSync(FILE_PATH, JSON.stringify(finalResult, null, 2));
    console.log(`💾 [XONG] Đã gộp kho phẳng thành công! Tổng cộng có: ${finalResult.length} video.`);
}

// Tự động kích hoạt khi bật server
crawlAndSaveToJSON();

// 🔥 LINK API DUY NHẤT: Trả về toàn bộ kho video chung đã xáo trộn ngẫu nhiên
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 40; 

    try {
        let liveVideos = [];
        if (fs.existsSync(FILE_PATH)) {
            liveVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (!Array.isArray(liveVideos)) liveVideos = [];
        }

        // Ép kiểu kho dự phòng về mảng phẳng để an toàn tuyệt đối
        let flatFallback = [];
        if (Array.isArray(fallbackDatabase)) {
            flatFallback = fallbackDatabase;
        } else if (fallbackDatabase && typeof fallbackDatabase === 'object') {
            flatFallback = Object.values(fallbackDatabase).flat();
        }

        // Gộp kho quét được + kho dự phòng bất tử
        const mergedResult = [...liveVideos, ...flatFallback];

        // Lọc trùng ID
        const uniqueMap = new Map();
        mergedResult.forEach(v => { if (v.video_id) uniqueMap.set(v.video_id, v); });
        const finalPlayList = Array.from(uniqueMap.values());

        // Xáo trộn ngẫu nhiên toàn bộ rổ video để mỗi lần load là một danh sách mới
        const shuffledVideos = finalPlayList.sort(() => 0.5 - Math.random());
        
        return res.json({
            code: 0,
            msg: "success",
            data: shuffledVideos.slice(0, count)
        });
    } catch (e) {
        let flatFallback = Array.isArray(fallbackDatabase) ? fallbackDatabase : Object.values(fallbackDatabase).flat();
        return res.json({ code: 0, msg: "success", data: flatFallback.sort(() => 0.5 - Math.random()).slice(0, count) });
    }
});

// Đường dẫn kích hoạt cào bằng tay
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã cào thêm video mới vứt thẳng vào kho chung rồi ông giáo nhé!");
});

app.listen(PORT, () => console.log(`🚀 Server tổng hợp chạy mượt mà tại cổng ${PORT}`));
