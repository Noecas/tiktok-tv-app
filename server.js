const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Đường dẫn tới file JSON duy nhất để lưu dữ liệu
const FILE_PATH = path.join(__dirname, 'videos.json');

// Khởi tạo file json trống với cấu trúc các mục nếu chưa tồn tại
if (!fs.existsSync(FILE_PATH)) {
    const initialData = { hai_huoc: [], tam_trang: [], game: [], phim_anh: [], kienthuc: [] };
    fs.writeFileSync(FILE_PATH, JSON.stringify(initialData, null, 2));
}

// Cấu hình từ khóa tương ứng cho các mục
const categoryMap = {
    "hai_huoc": "hài hước tik tok việt nam meme vui nhộn",
    "tam_trang": "nhạc buồn tâm trạng chill lofi buồn",
    "game": "highlight game pubg freefire liên quân",
    "phim_anh": "review phim hay tóm tắt phim truyền hình",
    "kienthuc": "kiến thức thú vị khoa học đời sống"
};

// ==========================================
// HÀM CÀO DỮ LIỆU VÀ GHI VÀO FILE .JSON (TỰ ĐỘNG LỌC TRÙNG)
// ==========================================
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu cào dữ liệu tích lũy vào file videos.json...");
    
    // Đọc dữ liệu hiện tại trong file ra trước
    let currentData = {};
    try {
        currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        currentData = { hai_huoc: [], tam_trang: [], game: [], phim_anh: [], kienthuc: [] };
    }

    // Duyệt qua từng mục để cào
    for (const [key, keyword] of Object.entries(categoryMap)) {
        try {
            console.log(`⏳ Đang cào dữ liệu cho mục: ${key}`);
            const response = await axios.post('https://www.tikwm.com/api/feed/search', {
                keywords: keyword,
                count: 40, // Mỗi danh mục cào hẳn 40 video cho nhiều
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

                // Gộp danh sách cũ lưu trong file và danh sách mới cào về
                const oldList = currentData[key] || [];
                const mergedList = [...oldList, ...fetchedVideos];

                // TIẾN HÀNH LỌC TRÙNG VĨNH VIỄN BẰNG VIDEO ID
                const uniqueMap = new Map();
                mergedList.forEach(video => uniqueMap.set(video.videoId, video));
                
                // Cập nhật lại mảng sạch vào danh mục
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] đã lưu tổng cộng: ${currentData[key].length} video không trùng.`);
            }
        } catch (err) {
            console.error(`❌ Lỗi khi cào mục [${key}]:`, err.message);
        }
    }

    // Ghi đè toàn bộ dữ liệu sạch vào file json duy nhất
    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã đồng bộ tất cả vào file videos.json gọn gàng!");
}

// 💥 TỰ ĐỘNG CHẠY CÀO: Mỗi lần bật Server lên (hoặc Render tự khởi động lại) là tự đi cào bù video ngay
crawlAndSaveToJSON();

// ==========================================
// API DÀNH CHO APP TV: ĐỌC TỪ FILE JSON RA TRẢ VỀ
// ==========================================
app.get('/api/category', (req, res) => {
    const categoryKey = req.query.name || "hai_huoc";
    const cursor = parseInt(req.query.cursor) || 0;
    const count = 20; // Mỗi lần App đòi thì trả về 20 video

    try {
        // Đọc file json lên
        const currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        const allVideos = currentData[categoryKey] || [];

        // Cắt mảng (Phân trang tĩnh ngay trong file)
        const paginatedVideos = allVideos.slice(cursor, cursor + count);
        let nextCursor = cursor + count;

        // Nếu người dùng cuộn đến cuối file, tự động xoay vòng lại từ đầu (0) để xem vô hạn
        if (nextCursor >= allVideos.length) {
            nextCursor = 0;
        }

        // Trả về đúng cấu trúc Object mà Android đang đợi
        return res.json({
            videos: paginatedVideos,
            nextCursor: nextCursor
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// NÚT KÍCH HOẠT BẰNG TAY: Ông giáo thích cào thêm lúc nào thì gõ link này trên trình duyệt
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã lệnh cho Server cào thêm video tích lũy vào file JSON rồi nhé ông giáo!");
});

app.listen(PORT, () => console.log(`🚀 Server quản lý file JSON tập trung đã chạy tại cổng ${PORT}`));
