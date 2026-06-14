const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// API LẤY DANH SÁCH VIDEO LIVE - KHÔNG DÙNG FILE TĨNH NỮA
app.get('/api/category', async (req, res) => {
    const categoryName = req.query.name;
    
    // Tự động phân phối từ khóa theo danh mục TV gửi lên
    let searchKeyword = "hài hước tik tok việt nam meme";
    if (categoryName === "tam_trang") {
        searchKeyword = "nhạc buồn tâm trạng chill lofi";
    }

    try {
        console.log(`🔍 TV đang gọi! Đang cào LIVE danh mục [${categoryName}]...`);
        
        const response = await axios.post('https://www.tikwm.com/api/feed/search', {
            keywords: searchKeyword,
            count: 12, // Lấy 12 video mỗi lần load cho nhẹ app
            cursor: 0
        });

        if (response.data && response.data.data && response.data.data.videos) {
            const videoList = response.data.data.videos;
            const parsedVideos = [];
            
            for (let video of videoList) {
                parsedVideos.push({
                    videoId: video.video_id,
                    author: "@" + video.author.unique_id,
                    title: video.title,
                    cover: video.cover, // Cover mới tinh không lo sập link
                    views: video.play_count,
                    // 🔥 ĐÚT THẲNG LINK .MP4 VÀO ĐÂY CHO APP TV HÚP LUÔN, KHÔNG CẦN CHUYỂN HƯỚNG CỒ KỀNH
                    videoUrl: video.play, 
                    originUrl: `https://www.tiktok.com/@${video.author.unique_id}/video/${video.video_id}`
                });
            }
            
            // Trả data tươi sống về cho App TV
            return res.json(parsedVideos);
        } else {
            return res.status(404).json({ error: "Không tìm thấy video nào!" });
        }
    } catch (error) {
        console.error("Lỗi cào live:", error.message);
        return res.status(500).json({ error: "Lỗi server: " + error.message });
    }
});

// Chạy server
app.listen(PORT, () => {
    console.log(`🚀 Server Real-time đang chạy tại cổng ${PORT}`);
});
