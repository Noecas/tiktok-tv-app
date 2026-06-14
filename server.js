const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const FILE_PATH = path.join(__dirname, 'videos.json');

// KHO VIDEO CỨU NGUY HỆ THỐNG (Dùng ngay khi API TikWM bị lỗi hoặc chặn 403)
const fallbackDatabase = {
    "hai_huoc": [
        {
            "video_id": "7311111111111111111",
            "play": "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c001-e7/oAAnZfIAnCAgEw7DlBAfD7eIEgKQA7bVAfQfQA/",
            "title": "Tổng hợp clip hài hước vô tri xả stress cực mạnh cười bể bụng",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 154000,
            "author": { "nickname": "@haihuoc_tv" },
            "music_info": { "title": "Nhạc nền tấu hài vui nhộn" }
        },
        {
            "video_id": "7311111111111111112",
            "play": "https://www.w3schools.com/html/mov_bbb.mp4", // Video mẫu chạy thử siêu ổn định
            "title": "Khi bạn cố gắng làm video hài tik tok việt nam và cái kết bất ngờ",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 98000,
            "author": { "nickname": "@meme_vietnam" },
            "music_info": { "title": "Âm thanh gốc hài hước" }
        }
    ],
    "tam_trang": [
        {
            "video_id": "7322222222222222221",
            "play": "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c001-e7/oAAnZfIAnCAgEw7DlBAfD7eIEgKQA7bVAfQfQA/",
            "title": "Nhạc lofi chill tâm trạng buồn - Bản nhạc dành cho những đêm muộn cô đơn",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 245000,
            "author": { "nickname": "@lofi_chill_dem" },
            "music_info": { "title": "Lofi Tâm Trạng Đêm" }
        }
    ],
    "game": [
        {
            "video_id": "7333333333333333331",
            "play": "https://www.w3schools.com/html/movie.mp4",
            "title": "Highlight Liên Quân Mobile - Pha lật kèo kinh điển của Thần đồng",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 312000,
            "author": { "nickname": "@liquan_highlight" },
            "music_info": { "title": "Nhạc chiến game cực căng" }
        }
    ],
    "phim_anh": [
        {
            "video_id": "7344444444444444441",
            "play": "https://www.w3schools.com/html/mov_bbb.mp4",
            "title": "Review phim hay nghẹt thở: Sát thủ ẩn danh tái xuất giang hồ cực đỉnh",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 870000,
            "author": { "nickname": "@review_phim_hay" },
            "music_info": { "title": "Review Phim Kịch Tính" }
        }
    ],
    "kienthuc": [
        {
            "video_id": "7355555555555555551",
            "play": "https://www.w3schools.com/html/movie.mp4",
            "title": "Kiến thức thú vị: Sự thật lạ lùng về vũ trụ rộng lớn mà bạn chưa từng biết",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 450000,
            "author": { "nickname": "@khoahoc_thuvi" },
            "music_info": { "title": "Khám Phá Thế Giới" }
        }
    ],
    "van_minh": [
        {
            "video_id": "7366666666666666661",
            "play": "https://www.w3schools.com/html/mov_bbb.mp4",
            "title": "Bài học cuộc sống ý nghĩa: Cách ứng xử văn minh lịch sự nơi công cộng",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 120000,
            "author": { "nickname": "@song_van_minh" },
            "music_info": { "title": "Truyền cảm hứng chữa lành" }
        }
    ],
    "threads_topic": [
        {
            "video_id": "7377777777777777771",
            "play": "https://www.w3schools.com/html/movie.mp4",
            "title": "Tóm tắt drama hot nhất trên Threads Việt Nam hôm nay - Góc tâm sự thầm kín",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 68000,
            "author": { "nickname": "@threads_confession" },
            "music_info": { "title": "Đọc tin tức Threads chill" }
        }
    ]
};

// Khởi tạo file JSON bằng kho dữ liệu cứu nguy ban đầu để tránh lỗi "Danh mục trống"
if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(fallbackDatabase, null, 2));
}

// KHO TỪ KHÓA ĐỂ CÀO TIKTOK
const keywordsDatabase = {
    "hai_huoc": ["hài hước tik tok việt nam", "tấu hài cực mạnh tiktok", "clip vui cười rớt hàm"],
    "tam_trang": ["nhạc buồn tâm trạng chill", "lofi tâm trạng buồn", "nhạc lofi chill đêm muộn"],
    "game": ["highlight liên quân mobile", "pubg mobile việt nam hài", "liên minh huyền thoại tấu hài"],
    "phim_anh": ["review phim hay kịch tính", "tóm tắt phim truyền hình"],
    "kienthuc": ["kiến thức thú vị đời sống", "sự thật lạ lùng bạn chưa biết"],
    "van_minh": ["lối sống văn minh tích cực", "bài học cuộc sống ý nghĩa", "chữa lành tâm hồn nhẹ nhàng"],
    "threads_topic": ["story threads việt nam", "tóm tắt drama threads", "tâm sự threads hài hước"]
};

// Hàm tự động cào dữ liệu nâng cấp (Bẻ khóa 403 + Tự động dùng dự phòng nếu lỗi)
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
            
            // 🔥 CẢI TIẾN LỚN: Thêm Headers giả lập Trình duyệt Chrome xịn sò qua mặt bộ lọc chống bot
            const response = await axios.get(targetUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos) && response.data.data.videos.length > 0) {
                const fetchedVideos = response.data.data.videos.map(v => ({
                    video_id: v.video_id,
                    play: v.play,
                    title: v.title || "Video TikTok thú vị",
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

                // Lọc trùng bằng Video ID
                const uniqueMap = new Map();
                mergedList.forEach(video => {
                    if (video.video_id) uniqueMap.set(video.video_id, video);
                });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] cào thành công! Kho đang tích lũy: ${currentData[key].length} video.`);
            } else {
                console.log(`⚠️ TikWM trả data rỗng cho mục [${key}]. Tự động giữ lại kho video mẫu.`);
                if (!currentData[key] || currentData[key].length === 0) {
                    currentData[key] = fallbackDatabase[key];
                }
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]: ${err.message}. Kích hoạt kho cứu nguy.`);
            // Nếu lỗi 403 mà trong kho chưa có gì, lập tức nạp kho cứu nguy để bảo vệ App không bị trống
            if (!currentData[key] || currentData[key].length === 0) {
                currentData[key] = fallbackDatabase[key];
            }
        }
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Tiến trình xử lý hoàn tất!");
}

// Bật server lên là tự động kiểm tra nạp đợt đầu luôn
crawlAndSaveToJSON();

// API chính trả dữ liệu về cho Android Studio (Đã tối ưu hóa bảo vệ app 100%)
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

        // Nếu file trống không có video nào, lấy ngay kho fallback đắp vào khẩn cấp
        if (allVideos.length === 0) {
            allVideos = fallbackDatabase[categoryKey] || [];
        }

        // Thuật toán xáo trộn ngẫu nhiên để nội dung trên TV luôn mới mẻ
        const shuffledVideos = [...allVideos].sort(() => 0.5 - Math.random());
        const selectedBatch = shuffledVideos.slice(0, count);

        return res.json({
            code: 0,
            msg: "success",
            data: selectedBatch
        });
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
