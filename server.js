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
    "van_minh": [
        "lối sống văn minh tích cực", "bài học cuộc sống ý nghĩa", 
        "phát triển bản thân mỗi ngày", "chữa lành tâm hồn nhẹ nhàng", 
        "truyền cảm hứng tích cực", "ứng xử văn minh lịch sự",
        "động lực cuộc sống mỗi ngày"
    ],
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
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        
        try {
            console.log(`⏳ Đang cào cho mục [${key}] bằng từ khóa: "${randomKeyword}"`);
            const response = await axios.post('https://www.tikwm.com/api/feed/search', {
                keywords: randomKeyword,
                count: 50, // 🔥 ĐÃ TĂNG: Lấy hẳn 50 video mỗi lần cào cho kho dữ liệu mau đầy
                cursor: 0
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                // ĐÃ SỬA: Map chuẩn xác 100% các trường dữ liệu khớp với Model Android App (TikWMVideoDetail)
                const fetchedVideos = response.data.data.videos.map(v => ({
                    video_id: v.video_id,
                    play: v.play,
                    title: v.title || "Video TikTok",
                    cover: v.cover,
                    play_count: v.play_count || 0,
                    author: {
                        nickname: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user"
                    },
                    music_info: {
                        title: v.music_info?.title || "Âm thanh gốc"
                    }
                }));

                const oldList = currentData[key] || [];
                const mergedList = [...oldList, ...fetchedVideos];

                // LỌC TRÙNG TUYỆT ĐỐI BẰNG VIDEO ID CHUẨN
                const uniqueMap = new Map();
                mergedList.forEach(video => {
                    if (video.video_id) uniqueMap.set(video.video_id, video);
                });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] đang tích lũy tổng cộng: ${currentData[key].length} video.`);
            } else {
                console.log(`⚠️ TikWM không trả mảng videos cho mục [${key}]. Giữ nguyên list cũ.`);
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]:`, err.message);
        }
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã lưu tất cả tích lũy vào file videos.json!");
}

// Bật server lên là tự động đi cào đợt đầu luôn
crawlAndSaveToJSON();

// ========================================================
// API CHÍNH TRẢ VỀ: ĐÃ ĐỔI THEO ĐÚNG ĐỊNH DẠNG RETROFIT APP TV
// ========================================================
app.get('/api/category', (req, res) => {
    const categoryKey = req.query.name || "hai_huoc";
    
    // 🔥 ĐÃ TĂNG: Mặc định nạp hẳn 35 video lên cho App Android cuộn mỏi tay
    const count = parseInt(req.query.count) || 35; 

    try {
        if (!fs.existsSync(FILE_PATH)) {
            return res.json({ code: 0, msg: "Đợi xíu đang khởi tạo dữ liệu", data: [] });
        }

        const currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        const allVideos = currentData[categoryKey] || [];

        if (allVideos.length === 0) {
            return res.json({ code: 0, msg: "Danh mục trống", data: [] });
        }

        // 🧠 THUẬT TOÁN ĐỔI MỚI: Trộn ngẫu nhiên danh sách video có trong kho dữ liệu
        // Giúp mỗi lần người dùng bấm vào danh mục trên TV sẽ hiện ra loạt video mới tinh!
        const shuffledVideos = [...allVideos].sort(() => 0.5 - Math.random());
        const selectedBatch = shuffledVideos.slice(0, count);

        // ĐÃ SỬA CHUẨN: Trả về đúng object cấu trúc TikWMFeedResponse (code, msg, data)
        return res.json({
            code: 0,
            msg: "success",
            data: selectedBatch
        });
    } catch (e) {
        return res.status(500).json({ code: -1, msg: e.message, data: null });
    }
});

// Nút kích hoạt cào thêm bằng tay: gõ link này trên trình duyệt để nạp thêm video vỗ béo kho JSON
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã cào thêm từ khóa mới nén vào file JSON rồi nhé ông giáo!");
});

app.listen(PORT, () => console.log(`🚀 Server chạy mượt mà tại cổng ${PORT}`));
