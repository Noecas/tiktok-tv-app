const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const FILE_PATH = path.join(__dirname, 'videos.json');

// Khởi tạo cấu trúc các mục mới trong file JSON (Thêm van_minh và threads_topic)
if (!fs.existsSync(FILE_PATH)) {
    const initialData = { 
        hai_huoc: [], 
        tam_trang: [], 
        game: [], 
        phim_anh: [], 
        kienthuc: [],
        van_minh: [],
        threads_topic: []
    };
    fs.writeFileSync(FILE_PATH, JSON.stringify(initialData, null, 2));
}

// KHO TỪ KHÓA SIÊU CẤP MỞ RỘNG (VĂN MINH, HÀI, GAME, THREADS...)
const keywordsDatabase = {
    "hai_huoc": [
        "hài hước tik tok việt nam", "meme vui nhộn giải trí", 
        "tấu hài cực mạnh tiktok", "clip vui cười rớt hàm", 
        "giải trí hài hước triệu view", "phim ngắn hài hước bựa",
        "vô tri hài hước", "tổng hợp clip vui nhộn"
    ],
    "tam_trang": [
        "nhạc buồn tâm trạng chill", "lofi tâm trạng buồn", 
        "suy nghĩ về cuộc sống buồn", "stt tâm trạng cô đơn", 
        "nhạc lofi chill đêm muộn", "soundtrack buồn tâm trạng"
    ],
    "game": [
        "highlight liên quân mobile", "pubg mobile việt nam hài", 
        "free fire highlight mượt", "liên minh huyền thoại tấu hài",
        "game hay tik tok", "funny gaming moments vn", "bình luận game tấu hài"
    ],
    "phim_anh": [
        "review phim hay ngột ngạt", "tóm tắt phim truyền hình", 
        "cắt cảnh phim hay nhất", "review phim kịch tính"
    ],
    "kienthuc": [
        "kiến thức thú vị đời sống", "khoa học đời sống bí ẩn", 
        "sự thật lạ lùng bạn chưa biết", "khám phá thế giới quanh ta",
        "lịch sử thế giới thú vị"
    ],
    // MỤC VĂN MINH (Nội dung tích cực, chữa lành, bài học sâu sắc)
    "van_minh": [
        "lối sống văn minh tích cực", "bài học cuộc sống ý nghĩa", 
        "phát triển bản thân mỗi ngày", "chữa lành tâm hồn nhẹ nhàng", 
        "truyền cảm hứng tích cực", "ứng xử văn minh lịch sự",
        "động lực cuộc sống mỗi ngày"
    ],
    // MỤC THREADS TOPIC (Drama, tâm sự, chuyện hay từ Threads VN)
    "threads_topic": [
        "story threads việt nam", "tóm tắt drama threads", 
        "tâm sự threads hài hước", "threads hot topic vn", 
        "đọc tin threads chill", "threads confession việt nam",
        "chuyện ly kỳ trên threads"
    ]
};

// Hàm tự động cào tích lũy dữ liệu sạch vào file JSON
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu cào dữ liệu tích lũy...");
    
    let currentData = {};
    try {
        currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        currentData = { hai_huoc: [], tam_trang: [], game: [], phim_anh: [], kienthuc: [], van_minh: [], threads_topic: [] };
    }

    for (const [key, keywords] of Object.entries(keywordsDatabase)) {
        // Mỗi lần cào, server lấy ngẫu nhiên 1 từ khóa trong danh sách của mục đó để nội dung luôn đổi mới
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        
        try {
            console.log(`⏳ Đang cào cho mục [${key}] bằng từ khóa: "${randomKeyword}"`);
            const response = await axios.post('https://www.tikwm.com/api/feed/search', {
                keywords: randomKeyword,
                count: 35, // Lấy 35 video mỗi mục
                cursor: 0
            });

            if (response.data && response.data.data && response.data.data.videos) {
                const fetchedVideos = response.data.data.videos.map(v => ({
                    videoId: v.video_id,
                    author: "@" + v.author.unique_id,
                    title: v.title,
                    cover: v.cover,
                    views: v.play_count || 0,
                    videoUrl: v.play,
                    originUrl: `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`
                }));

                const oldList = currentData[key] || [];
                const mergedList = [...oldList, ...fetchedVideos];

                // LỌC TRÙNG TUYỆT ĐỐI BẰNG VIDEO ID
                const uniqueMap = new Map();
                mergedList.forEach(video => uniqueMap.set(video.videoId, video));
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] đang có tổng cộng: ${currentData[key].length} video.`);
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]:`, err.message);
        }
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã lưu tất cả vào file videos.json!");
}

// Bật server lên là tự động đi cào đợt đầu luôn
crawlAndSaveToJSON();

// API chính để App Android gọi lên lấy dữ liệu
app.get('/api/category', (req, res) => {
    const categoryKey = req.query.name || "hai_huoc";
    const cursor = parseInt(req.query.cursor) || 0;
    const count = 15; // Trả về 15 video mỗi lần gọi cho app mượt

    try {
        const currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        const allVideos = currentData[categoryKey] || [];

        const paginatedVideos = allVideos.slice(cursor, cursor + count);
        let nextCursor = cursor + count;

        if (nextCursor >= allVideos.length) {
            nextCursor = 0; // Cuộn hết thì quay lại từ đầu video số 0
        }

        return res.json({
            videos: paginatedVideos,
            nextCursor: nextCursor
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Nút kích hoạt cào thêm bằng tay: gõ link này trên trình duyệt để nạp thêm video
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã cào thêm từ khóa mới nén vào file JSON rồi nhé!");
});

app.listen(PORT, () => console.log(`🚀 Server chạy tại cổng ${PORT}`));
