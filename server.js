const express = require('express');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000; // Render tự cấp cổng, không tự điền 3000 cố định

// ====== HÀM TỰ ĐỘNG CÀO DỮ LIỆU KHI START SERVER ======
async function crawlVietnameseContent(categoryName, searchKeyword) {
    try {
        console.log(`🇻🇳 Bot đang quét mục [${categoryName}] với từ khóa: "${searchKeyword}"...`);
        const response = await axios.post('https://www.tikwm.com/api/feed/search', {
            keywords: searchKeyword,
            count: 15,
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
                    cover: video.cover,
                    views: video.play_count,
                    originUrl: `https://www.tiktok.com/@${video.author.unique_id}/video/${video.video_id}`
                });
            }
            fs.writeFileSync(`./${categoryName}.json`, JSON.stringify(parsedVideos, null, 2), 'utf-8');
            console.log(`✅ Đã cập nhật file: ${categoryName}.json`);
        }
    } catch (error) {
        console.error(`❌ Lỗi cào mục [${categoryName}]:`, error.message);
    }
}

// Chạy cào luôn khi server bật lên
async function initBot() {
    await crawlVietnameseContent("hai_huoc", "hài hước tik tok việt nam meme");
    await crawlVietnameseContent("tam_trang", "nhạc buồn tâm trạng chill lofi");
    console.log("🎉 DATA ĐÃ SẴN SÀNG PHỤC VỤ TV!");
}
initBot();


// ====== CÁC ĐƯỜNG DẪN API CHO APP TV GỌI CẤP LUỒNG ======

// 1. Lấy danh sách video hiện lên ô vuông Grid
app.get('/api/category', (req, res) => {
    const categoryName = req.query.name;
    const filePath = `./${categoryName}.json`;
    if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath);
        return res.json(JSON.parse(rawData));
    } else {
        return res.status(404).json({ error: "Chưa có data danh mục này!" });
    }
});

// Sửa lại đoạn endpoint stream trả về dạng JSON thay vì Redirect
app.get('/api/stream', async (req, res) => {
    const tiktokUrl = req.query.url;
    if (!tiktokUrl) return res.status(400).json({ error: "Thiếu url!" });
    try {
        const apiResponse = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`);
        if (apiResponse.data && apiResponse.data.data) {
            // Trả về object JSON chứa link để App TV tự bóc ra đem đi phát
            return res.json({ url: apiResponse.data.data.play }); 
        }
        return res.status(404).json({ error: "Không bóc được luồng" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Giữ cho server luôn thức
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tít mù tại cổng ${PORT}`);
});
