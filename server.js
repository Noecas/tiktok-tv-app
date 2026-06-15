const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =======================================================================================
// 🔥🔥🔥 KHU VỰC QUẢN LÝ TỪ KHÓA CÀO VIDEO - ÔNG GIÁO THÊM/SỬA/XÓA Ở ĐÂY CHO DỄ THẤY 🔥🔥🔥
// =======================================================================================
const keywordsDatabase = [
    "trend bien hinh tiktok viet nam", 
    "remix giat giat cuon", 
    "vinahouse remix tiktok hot",
    "mashup hot tiktok hien tai",
    "dance trend tiktok viet nam",
    "nhac tre hot tikwm",
    "vibe gen z viet nam", 
    "meme gen z hai huoc", 
    "trend tiktok hien tai genz",
    "flexing gen z viet nam", 
    "slang gen z hai huoc",
    "street style viet nam trend",
    "Trai đẹp Trung Quốc",
    "Trai đẹp Hàn Quốc",
    "review do an hot trend genz",
    "Audio Việt Nam",
    "Audio Tổng Tài",
    "Audio Thiên Kim",
    "trend nhảy tiktok hot",
    "nhạc căng đét tiktok",
    " hate that i made you love me VN",
    "biến hình vịt hóa thiên nga",
    "gái xinh nhảy edm hot",
    "vũ điệu cuốn hút tiktok",
    "podcast chữa lành tâm trạng gen z",
    "mukbang do an sieu ngon",
    "review phim ngan tom tat hai huoc",
    "funny meme viet nam giải trí",
    "ootd phoi do thoi trang genz",
    "vlog cuoc song hang ngay chill",
    "goc khuat cuoc song tam trang",
    "TikTok Việt Nam",
    "Trai đẹp Việt Nam",
    "xuhuong"
];

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// THUẬT TOÁN ĐẢO MẢNG KHỦNG: Trộn từa lưa, đều bét nhè
function shuffle(array) {
    if (!Array.isArray(array)) return array;
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV App đang hoạt động - Đang chạy chế độ Thống Kê Bộ Lọc Quốc Tịch!");
});

// 🔥 HÀM KIỂM TRA CHẶN VIDEO NƯỚC NGOÀI
function isVietnameseContent(title) {
    if (!title) return false;

    // 1. Chặn các ký tự Trung Quốc, Nhật Bản, Hàn Quốc
    const foreignRegex = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\uac00-\ud7af]/;
    if (foreignRegex.test(title)) return false;

    // 2. Kiểm tra xem tiêu đề có chứa dấu tiếng Việt hay không
    const vnTones = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
    const commonVnWords = /threads|tiktok|remix|hot|review|vlog|drama|vs|tv|idols|p1|p2|part|dance|mashup|edm|flex/i;
    
    if (vnTones.test(title) || commonVnWords.test(title)) {
        return true;
    }

    return false;
}

// Hàm cào dữ liệu: Tìm trend Việt Nam, lọc trùng, lọc nước ngoài + Thống kê số lượng
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu tiến trình cào dữ liệu trend Gen Z / EDM Việt Nam...");
    let oldVideos = [];
    
    // Khởi tạo các biến đếm tổng thống kê cho lượt cào này
    let totalFetchedFromAPI = 0;
    let totalValidVN = 0;
    let totalBlockedForeign = 0;

    try {
        if (fs.existsSync(FILE_PATH)) {
            const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
            oldVideos = JSON.parse(fileContent);
            if (!Array.isArray(oldVideos)) oldVideos = [];
        }
    } catch (e) {
        oldVideos = [];
    }

    let flatKeywords = [];
    if (Array.isArray(keywordsDatabase)) {
        flatKeywords = keywordsDatabase;
    } else if (keywordsDatabase && typeof keywordsDatabase === 'object') {
        flatKeywords = Object.values(keywordsDatabase).flat();
    }

    if (flatKeywords.length === 0) {
        console.log("⚠️ Không tìm thấy từ khóa nào!");
        return { error: "Không có từ khóa" };
    }

    // Chọn ngẫu nhiên 8 từ khóa xoay tua chống khóa IP
    const selectedKeywords = shuffle([...flatKeywords]).slice(0, 8);
    console.log(`📡 [HỆ THỐNG] Chọn ngẫu nhiên xoay tua ${selectedKeywords.length} từ khóa để quét sâu...`);

    let newlyFetchedVideos = [];

    for (const keyword of selectedKeywords) {
        // Quét 2 trang ngẫu nhiên cho mỗi từ khóa
        const pageCursors = [
            Math.floor(Math.random() * 4) * 10,       
            Math.floor(Math.random() * 4 + 4) * 10   
        ];

        for (const randomCursor of pageCursors) {
            try {
                // Nghỉ ngắn chống chặn IP (Rate Limit)
                await new Promise(resolve => setTimeout(resolve, 1500));

                console.log(`⏳ Đang quét từ khóa: "${keyword}" | Trang cursor: ${randomCursor}`);
                const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}`;
                
                const response = await axios.get(targetUrl, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                    }
                });

                if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                    let keywordValid = 0;
                    let keywordBlocked = 0;

                    const fetched = response.data.data.videos.map(v => {
                        totalFetchedFromAPI++; // Tăng tổng số video quét được từ API lên 1
                        
                        const titleText = v.title || "";
                        if (!isVietnameseContent(titleText)) {
                            totalBlockedForeign++; // Tăng bộ đếm chặn nước ngoài tổng
                            keywordBlocked++;      // Tăng bộ đếm chặn nước ngoài của riêng từ khóa này
                            return null; 
                        }

                        totalValidVN++; // Tăng bộ đếm video Việt Nam hợp lệ tổng
                        keywordValid++; // Tăng bộ đếm video Việt Nam hợp lệ của riêng từ khóa này
                        
                        return {
                            videoId: v.video_id,
                            videoUrl: v.play,
                            title: titleText,
                            cover: v.cover,
                            views: v.play_count || 0,
                            author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user",
                            originUrl: v.play
                        };
                    }).filter(v => v !== null);

                    console.log(`    -> Kết quả trang [${randomCursor}]: Nhận ${keywordValid} clip VN | Chặn đứng ${keywordBlocked} clip ngoại.`);
                    newlyFetchedVideos = [...newlyFetchedVideos, ...fetched];
                }
            } catch (err) {
                console.log(`⚠️ Lỗi cào từ khóa [${keyword}] trang [${randomCursor}]: ${err.message}`);
            }
        }
    }

    // Gộp kho cũ và kho mới cào
    const totalMerged = [...oldVideos, ...newlyFetchedVideos];

    // Lọc trùng tuyệt đối bằng videoId
    const uniqueMap = new Map();
    totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
    
    let finalResult = Array.from(uniqueMap.values());

    // Chốt chặn bảo vệ chống ghi đè file rỗng
    if (finalResult.length === 0) {
        console.log("⚠️ [CẢNH BÁO] Lượt này cào lỗi rỗng. Giữ nguyên file json cũ!");
        return {
            status: "Thất bại/Bị chặn IP",
            totalFetched: totalFetchedFromAPI,
            totalValid: totalValidVN,
            totalBlocked: totalBlockedForeign,
            totalInDatabase: oldVideos.length
        };
    }
    
    // Nới rộng kho lưu trữ tổng lên tối đa 3000 video trộn bét nhè
    finalResult = shuffle(finalResult).slice(-3000);

    fs.writeFileSync(FILE_PATH, JSON.stringify(finalResult, null, 2));

    // 🌟 IN BẢNG THỐNG KÊ SIÊU ĐẸP RA CONSOLE TERMINAL CHO ÔNG GIÁO XEM
    console.log(`\n📊 ========================================================`);
    console.log(`📊 [THỐNG KÊ HOÀN THÀNH TIẾN TRÌNH CÀO VIDEO TREND]`);
    console.log(`   - 🔎 Tổng số video quét từ API TikWM : ${totalFetchedFromAPI} clip`);
    console.log(`   - ✅ Số clip tiếng Việt XỊN giữ lại  : ${totalValidVN} clip`);
    console.log(`   - ❌ Số clip nước ngoài bị CHẶN ĐỨNG : ${totalBlockedForeign} clip`);
    console.log(`   - 💾 Tổng số lượng kho lưu trữ JSON  : ${finalResult.length} clip (Đã lọc trùng & trộn bét nhè)`);
    console.log(`========================================================\n`);

    // Trả kết quả thống kê về để API sử dụng hiển thị lên web
    return {
        status: "Thành công rực rỡ!",
        totalFetched: totalFetchedFromAPI,
        totalValid: totalValidVN,
        totalBlocked: totalBlockedForeign,
        totalInDatabase: finalResult.length
    };
}

// Chạy tự động cào dữ liệu khi vừa khởi động server
crawlAndSaveToJSON();

// 🔥 API TRẢ VỀ CHO APP TV (TRẢ THẲNG MẢNG ĐÃ TRỘN TỪA LƯA)
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 

    try {
        let liveVideos = [];
        if (fs.existsSync(FILE_PATH)) {
            liveVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (!Array.isArray(liveVideos)) liveVideos = [];
        }

        const uniqueMap = new Map();
        liveVideos.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
        
        let finalPlayList = Array.from(uniqueMap.values());
        finalPlayList = shuffle(finalPlayList);
        
        return res.json(finalPlayList.slice(0, count));
    } catch (e) {
        return res.json([]);
    }
});

// 🔥 API TÌM KIẾM ĐỘNG THEO TỪ KHÓA BẤT KỲ
app.get('/api/video/search', async (req, res) => {
    const keyword = req.query.keyword;
    const count = parseInt(req.query.count) || 50; 
    
    if (!keyword) return res.json([]);

    try {
        console.log(`🔍 [LIVE SEARCH] Người dùng TV đang gõ tìm từ khóa: "${keyword}"`);
        const randomCursor = Math.floor(Math.random() * 3) * 10; 
        const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=${count}&cursor=${randomCursor}`;
        
        const response = await axios.get(targetUrl, { 
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });

        if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
            let fetched = response.data.data.videos.map(v => {
                const titleText = v.title || "";
                if (!isVietnameseContent(titleText)) return null; 

                return {
                    videoId: v.video_id,
                    videoUrl: v.play,
                    title: titleText,
                    cover: v.cover,
                    views: v.play_count || 0,
                    author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user",
                    originUrl: v.play
                };
            }).filter(v => v !== null);

            fetched = shuffle(fetched);
            return res.json(fetched);
        }
        return res.json([]);
    } catch (err) {
        console.log(`⚠️ Lỗi tìm kiếm live từ khóa [${keyword}]: ${err.message}`);
        return res.json([]);
    }
});

// 🔥 API TRUNG CHUYỂN BÌNH LUẬN
app.get('/api/comment/list', async (req, res) => {
    const videoId = req.query.video_id;
    if (!videoId) return res.json({ code: -1, msg: "Thiếu tham số video_id rồi ông giáo!" });
    
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
        return res.json({ code: -1, msg: err.message });
    }
});

// 🌟 LINK KÍCH HOẠT CÀO BẰNG TAY: Bây giờ trả ra giao diện JSON thống kê siêu chi tiết!
app.get('/api/crawl-more', async (req, res) => {
    const reportStats = await crawlAndSaveToJSON();
    res.json({
        message: "Hệ thống bot vừa thực hiện quét kho video mới xong!",
        thong_ke_chi_tiet: reportStats
    });
});

// Tự động cào định kỳ 45 phút một lần để làm mới kho
setInterval(async () => {
    console.log("⏰ [HẸN GIỜ] Tự động kích hoạt bot quét bài mới chống cạn kho dữ liệu...");
    try {
        await crawlAndSaveToJSON();
    } catch (err) {
        console.log("⚠️ Lỗi cập nhật tự động định kỳ:", err.message);
    }
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Trend Việt chạy mượt mà tại cổng ${PORT}`));
