const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { fallbackDatabase, keywordsDatabase } = require('./video');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV App đang hoạt động - Chế độ: KHO VIDEO TREND GEN Z & EDM VIỆT NAM!");
});

// 🔥 HÀM KIỂM TRA CHẶN VIDEO NƯỚC NGOÀI (Chặn chữ Trung, Hàn, Nhật và các clip không có chữ Việt)
function isVietnameseContent(title) {
    if (!title) return false;

    // 1. Chặn các ký tự Trung Quốc, Nhật Bản, Hàn Quốc (Nhìn phát biết ngay clip reup nước ngoài)
    const foreignRegex = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\uac00-\ud7af]/;
    if (foreignRegex.test(title)) return false;

    // 2. Kiểm tra xem tiêu đề có chứa dấu tiếng Việt hay không (để giữ lại clip thuần Việt)
    // Các ký tự dấu đặc trưng của tiếng Việt
    const vnTones = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
    
    // Nếu tiêu đề có chữ tiếng Việt HOẶC chứa các từ không dấu phổ biến thì cho qua
    const commonVnWords = /threads|tiktok|remix|hot|review|vlog|drama|vs|tv|idols|p1|p2|part|dance|mashup|edm|flex/i;
    
    if (vnTones.test(title) || commonVnWords.test(title)) {
        return true;
    }

    // Nếu tiêu đề toàn chữ tiếng Anh không dấu dài loằng ngoằng thì tạm thời loại bớt để ưu tiên Việt Nam
    return false;
}

// Hàm cào dữ liệu: Tìm trend Việt Nam và lọc trùng, lọc nước ngoài
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu tiến trình cào dữ liệu trend Gen Z / EDM Việt Nam...");
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

    // Đảm bảo ép kiểu từ khóa về mảng phẳng
    let flatKeywords = [];
    if (Array.isArray(keywordsDatabase)) {
        flatKeywords = keywordsDatabase;
    } else if (keywordsDatabase && typeof keywordsDatabase === 'object') {
        flatKeywords = Object.values(keywordsDatabase).flat();
    }

    if (flatKeywords.length === 0) {
        console.log("⚠️ Không tìm thấy từ khóa nào!");
        return;
    }

    // Chọn ngẫu nhiên 5 từ khóa trend để quét mỗi lượt
    const selectedKeywords = [...flatKeywords].sort(() => 0.5 - Math.random()).slice(0, 5);

    for (const keyword of selectedKeywords) {
        try {
            const randomCursor = Math.floor(Math.random() * 8) * 10; // Quét sâu từ trang 0 đến trang 70
            console.log(`⏳ Đang quét trend: "${keyword}" | Trang: ${randomCursor}`);
            
            const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}`;
            
            const response = await axios.get(targetUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                let validCount = 0;
                let skipCount = 0;

                const fetched = response.data.data.videos.map(v => {
                    const titleText = v.title || "";
                    
                    // 🔥 BỘ LỌC: Chỉ giữ lại video có nội dung Tiếng Việt/Trend Việt
                    if (!isVietnameseContent(titleText)) {
                        skipCount++;
                        return null; 
                    }

                    validCount++;
                    return {
                        video_id: v.video_id,
                        play: v.play,
                        title: titleText,
                        cover: v.cover,
                        play_count: v.play_count || 0,
                        author: { nickname: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user" },
                        music_info: { title: v.music_info?.title || "Âm thanh gốc" }
                    };
                }).filter(v => v !== null); // Loại bỏ những video nước ngoài bị đánh dấu null

                console.log(`   👉 Kết quả lọc từ khóa [${keyword}]: Nhận ${validCount} clip Việt Nam | Loại bỏ ${skipCount} clip nước ngoài.`);
                currentVideos = [...currentVideos, ...fetched];
            }
        } catch (err) {
            console.log(`⚠️ Lỗi cào từ khóa [${keyword}]: ${err.message}`);
        }
    }

    // Lọc trùng ID video
    const uniqueMap = new Map();
    currentVideos.forEach(v => { if (v.video_id) uniqueMap.set(v.video_id, v); });
    
    // Nới rộng kho chứa lên 200 video Việt Nam xem cho đã đời
    const finalResult = Array.from(uniqueMap.values()).slice(-200);

    fs.writeFileSync(FILE_PATH, JSON.stringify(finalResult, null, 2));
    console.log(`💾 [THÀNH CÔNG] Kho tổng Việt Nam đang có: ${finalResult.length} video sạch.`);
}

// Chạy tự động cào dữ liệu khi vừa khởi động server
crawlAndSaveToJSON();

// 🔥 API TRẢ VỀ CHO APP TV (XÁO TRỘN BÙM XUM)
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 45; 

    try {
        let liveVideos = [];
        if (fs.existsSync(FILE_PATH)) {
            liveVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (!Array.isArray(liveVideos)) liveVideos = [];
        }

        let flatFallback = Array.isArray(fallbackDatabase) ? fallbackDatabase : Object.values(fallbackDatabase).flat();
        const mergedResult = [...liveVideos, ...flatFallback];

        const uniqueMap = new Map();
        mergedResult.forEach(v => { if (v.video_id) uniqueMap.set(v.video_id, v); });
        const finalPlayList = Array.from(uniqueMap.values());

        // Xáo trộn ngẫu nhiên toàn bộ mảng (Vui, Buồn, Nhạc quẩy xen kẽ thất thường cực cuốn)
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

// 🔥 API TRUNG CHUYỂN BÌNH LUẬN (MỚI THÊM CHO APP TV)
app.get('/api/comment/list', async (req, res) => {
    const videoId = req.query.video_id;
    if (!videoId) {
        return res.json({ code: -1, msg: "Thiếu tham số video_id rồi ông giáo!" });
    }
    
    try {
        console.log(`💬 Đang trung chuyển lấy bình luận cho video ID: ${videoId}`);
        const targetUrl = `https://www.tikwm.com/api/comment/list?video_id=${videoId}&count=30`;
        
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        
        return res.json(response.data);
    } catch (err) {
        console.log(`⚠️ Lỗi khi tải bình luận từ TikWM: ${err.message}`);
        return res.json({ code: -1, msg: err.message });
    }
});

// Link kích hoạt bằng tay khi cần khẩn cấp
app.get('/api/crawl-more', async (req, res) => {
    await crawlAndSaveToJSON();
    res.send("Đã cập nhật quét kho video Trend Việt Nam mới và dọn sạch clip nước ngoài!");
});

// ====== BỘ TỰ ĐỘNG LÀM MỚI KHO VIDEO (HẸN GIỜ CÀO NGẦM MỚI THÊM) ======
// Cứ đúng 45 phút, server sẽ tự động kích hoạt chế độ cào để thay đổi kho video liên tục
setInterval(async () => {
    console.log("⏰ [HẸN GIỜ] Tự động kích hoạt bot quét bài mới chống cạn kho dữ liệu...");
    try {
        await crawlAndSaveToJSON();
    } catch (err) {
        console.log("⚠️ Lỗi cập nhật tự động định kỳ:", err.message);
    }
}, 45 * 60 * 1000); // 45 phút tính bằng mili-giây

app.listen(PORT, () => console.log(`🚀 Server Trend Việt chạy mượt mà tại cổng ${PORT}`));
