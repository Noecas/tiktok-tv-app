const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// BỘ NHỚ TẠM ĐỂ CHỐNG TRÙNG LẶP (Chỉ tồn tại khi server chạy)
const processedVideoIds = new Set(); 

// MỞ KHÓA TỪ KHÓA - Ông thích thêm gì thì thêm vào đây
const categoryMap = {
    "hai_huoc": "hài hước tik tok việt nam meme vui nhộn",
    "tam_trang": "nhạc buồn tâm trạng chill lofi buồn",
    "game": "highlight game pubg freefire liên quân",
    "phim_anh": "review phim hay tóm tắt phim",
    "kienthuc": "kiến thức thú vị khoa học đời sống"
};

app.get('/api/category', async (req, res) => {
    const categoryKey = req.query.name || "hai_huoc";
    const cursor = req.query.cursor || 0;
    const keyword = categoryMap[categoryKey] || categoryMap["hai_huoc"];

    try {
        console.log(`🔍 Đang cào [${categoryKey}] - Cursor: ${cursor}`);
        
        const response = await axios.post('https://www.tikwm.com/api/feed/search', {
            keywords: keyword,
            count: 20, // Mỗi lần lấy 20 cái cho nó phê
            cursor: cursor
        });

        if (response.data && response.data.data && response.data.data.videos) {
            let videos = response.data.data.videos;

            // LỌC TRÙNG LẶP: Chỉ giữ lại những ID chưa từng xuất hiện
            const uniqueVideos = videos.filter(v => {
                if (processedVideoIds.has(v.video_id)) return false;
                processedVideoIds.add(v.video_id); // Đánh dấu đã dùng
                return true;
            });

            // Nếu cào ra 20 cái mà trùng hết, đệ quy cào tiếp trang sau (để tránh trả về mảng rỗng cho App)
            if (uniqueVideos.length === 0 && cursor < 1000) {
                return res.redirect(`/api/category?name=${categoryKey}&cursor=${parseInt(cursor) + 20}`);
            }

            const parsed = uniqueVideos.map(v => ({
                videoId: v.video_id,
                author: "@" + v.author.unique_id,
                title: v.title,
                cover: v.cover,
                videoUrl: v.play,
                originUrl: `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`
            }));

            return res.json({
                videos: parsed,
                nextCursor: response.data.data.cursor // Trả về mã trang tiếp theo
            });
        }
        res.status(404).json({ error: "Hết nội dung!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server siêu cấp đã sẵn sàng!`));
