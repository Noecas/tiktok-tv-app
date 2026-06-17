const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =======================================================================================
// 🌟 GIỮ NGUYÊN 100% BỘ TỪ KHÓA GỐC CỦA ÔNG GIÁO
// =======================================================================================
const keywordsDatabase = {
    hai_huoc_meme: [
        "review phim", "lốp", "Threads Việt Nam", "TikTok Việt Nam", 
        "fyp", "xuhuong", "biketok", "xh", "hate that i made you love me", 
        "Capcut Giật Giật", "viral"
    ],
    am_thuc_vlog: [
        "review do an hot trend", "mukbang do an sieu ngon", 
        "vlog cuoc song hang ngay chill", "goc khuat cuoc song tam trang", 
        "podcast chữa lành tâm trạng ", "Chuỗi"
    ],
    audio_truyen: [
        "Audio Việt Nam", "Audio Tổng Tài", "Audio Thiên Kim"
    ],
    thoi_trang_trai_dep: [
        "Trai đẹp Việt Nam", "Trai đẹp Trung Quốc", "Trai đẹp Hàn Quốc"
    ],
    nhac_giat_giat: [
        "trend bien hinh tiktok viet nam", "funk", "phonk", 
        "remix giat giat cuon", "vinahouse remix tiktok hot", 
        "mashup hot tiktok hien tai", "dance trend tiktok viet nam", 
        "trend nhảy tiktok hot", "nhạc căng đét tiktok", 
        "gái xinh nhảy edm hot", "vũ điệu cuốn hút tiktok"
    ],
    generic_xuhuong: [
        "Trend TikTok hiện tại"
    ]
};

const categoryLimits = {
    hai_huoc_meme: 80,       
    am_thuc_vlog: 30,        
    audio_truyen: 40,       
    thoi_trang_trai_dep: 20,  
    nhac_giat_giat: 15,       
    generic_xuhuong: 50       
};

const app = Web = express(); 
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

function shuffle(array) {
    if (!Array.isArray(array)) return array;
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

app.get('/', (req, res) => {
    res.send("🚀 Server TikTok TV - Bộ lọc thông minh: Chủ đạo Việt, lâu lâu có Trung & Hàn!");
});

// =======================================================================================
// 🌟 BỘ LỌC CẢI TIẾN: VẪN VIỆT NGHÈO NÀN NHƯNG THI THOẢNG CHO TRUNG/HÀN LỌT LƯỚI
// =======================================================================================
function isVietnameseContent(title) {
    if (!title) return true; // Không có caption vẫn duyệt vì ăn theo từ khóa quét ban đầu

    // Nhận diện ký tự Trung Quốc và Hàn Quốc
    const hasChinese = /[\u4e00-\u9fa5]/.test(title);
    const hasKorean = /[\uac00-\ud7af]/.test(title);
    
    // Chặn tuyệt đối các tiếng khác (Nhật Bản, Thái Lan, Campuchia, Ả Rập...)
    const blockOthersRegex = /[\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u0e00-\u0e7f]/;
    if (blockOthersRegex.test(title)) return false;

    // 🔥 Ý ÔNG GIÁO: Nếu dính chữ Trung hoặc Hàn, chỉ cho phép lọt lưới ngẫu nhiên ~25% (lâu lâu mới xuất hiện)
    if (hasChinese || hasKorean) {
        return Math.random() < 0.25; 
    }

    // Kiểm tra tiếng Việt có dấu hoặc các từ khóa/hashtag hot của giới trẻ Việt
    const vnTones = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
    const commonVnWords = /threads|tiktok|remix|hot|review|vlog|drama|vs|tv|idols|p1|p2|part|dance|mashup|edm|flex|xuhuong|xh|fyp|trend|capcut|meme/i;
    
    if (vnTones.test(title) || commonVnWords.test(title)) {
        return true;
    }

    // Các trường hợp chữ Latinh không dấu (Ví dụ: "trai dep co mui", "nhac cuon qua") cho qua luôn
    return true;
}

// 📡 TIẾN TRÌNH CÀO VÀ ĐẾM LOG CHI TIẾT
async function crawlAndSaveToJSON() {
    console.log("\n🔄 [HỆ THỐNG] Bắt đầu tiến trình quét dữ liệu...");
    let oldVideos = [];
    
    let totalFetchedFromAPI = 0;
    let totalValidVN = 0;
    let totalBlockedForeign = 0;

    try {
        if (fs.existsSync(FILE_PATH)) {
            oldVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (!Array.isArray(oldVideos)) oldVideos = [];
        }
    } catch (e) { oldVideos = []; }

    let selectedKeywords = [];
    for (const category in keywordsDatabase) {
        const shuffledCatKeywords = shuffle([...keywordsDatabase[category]]);
        const picked = shuffledCatKeywords.slice(0, 4).map(kw => ({ text: kw, category: category }));
        selectedKeywords = [...selectedKeywords, ...picked];
    }
    
    selectedKeywords = shuffle(selectedKeywords);
    let newlyFetchedVideos = [];

    for (const item of selectedKeywords) {
        const keyword = item.text.trim();
        const category = item.category;
        const maxLimitForThisKeyword = categoryLimits[category] || 30; 

        let keywordVideosFetched = []; 
        let kwTotalFetched = 0;
        let kwKept = 0;
        let kwBlocked = 0;

        const pageCursors = [
            Math.floor(Math.random() * 10) * 10, 
            Math.floor(Math.random() * 10 + 10) * 10
        ];

        for (const randomCursor of pageCursors) {
            if (keywordVideosFetched.length >= maxLimitForThisKeyword) break;

            try {
                await new Promise(resolve => setTimeout(resolve, 1200)); 
                const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}&_r=${Math.random()}`;
                
                const response = await axios.get(targetUrl, { 
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
                });

                if (response.data && response.data.code !== 0) continue;

                if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                    const fetched = response.data.data.videos.map(v => {
                        totalFetchedFromAPI++; 
                        kwTotalFetched++;

                        const titleText = v.title || "";
                        if (!isVietnameseContent(titleText)) {
                            totalBlockedForeign++; 
                            kwBlocked++;
                            return null; 
                        }
                        totalValidVN++; 
                        kwKept++;
                        
                        return {
                            videoId: v.video_id,
                            videoUrl: v.play,
                            title: titleText,
                            cover: v.cover,
                            views: v.play_count || 0,
                            author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user",
                            authorName: v.author?.nickname || "Người dùng Tóp Tóp",
                            avatar: v.author?.avatar || "https://www.w3schools.com/howto/img_avatar.png"
                        };
                    }).filter(v => v !== null);

                    for (const video of fetched) {
                        if (keywordVideosFetched.length < maxLimitForThisKeyword) {
                            keywordVideosFetched.push(video);
                        } else { break; }
                    }
                }
            } catch (err) { /* Bỏ qua lỗi kết nối lẻ */ }
        }
        
        // 📊 IN CHI TIẾT TỪNG TỪ KHÓA ĐỂ THEO DÕI SẢN LƯỢNG
        console.log(`🔎 [${category.toUpperCase()}] Từ khóa: "${keyword}" -> Tìm thấy: ${kwTotalFetched} | Giữ lại: ${kwKept} | Loại bỏ: ${kwBlocked} -> Gom thực tế: ${keywordVideosFetched.length} bài.`);
        
        newlyFetchedVideos = [...newlyFetchedVideos, ...keywordVideosFetched];
    }

    const totalMerged = [...oldVideos, ...newlyFetchedVideos];
    const uniqueMap = new Map();
    totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
    
    let finalResult = Array.from(uniqueMap.values());
    if (finalResult.length === 0) return { status: "Kho rỗng" };
    
    finalResult = shuffle(finalResult).slice(-5000);
    fs.writeFileSync(FILE_PATH, JSON.stringify(finalResult, null, 2));

    // 📊 BẢNG TỔNG KẾT SAU KHI HOÀN THÀNH TIẾN TRÌNH
    console.log(`\n📊 ========================================================`);
    console.log(`📊 [THỐNG KÊ HOÀN THÀNH TIẾN TRÌNH CÀO VIDEO TREND]`);
    console.log(`   - 🔎 Tổng số video quét từ API TikWM : ${totalFetchedFromAPI} clip`);
    console.log(`   - ✅ Số clip được DUYỆT giữ lại     : ${totalValidVN} clip (Chủ yếu Việt + Một ít Trung/Hàn)`);
    console.log(`   - ❌ Số clip bị CHẶN HOẶC LỌC BỎ     : ${totalBlockedForeign} clip`);
    console.log(`   - 💾 Tổng số lượng kho lưu trữ JSON  : ${finalResult.length} clip`);
    console.log(`========================================================\n`);

    return {
        status: "Thành công!",
        totalFetched: totalFetchedFromAPI,
        totalValid: totalValidVN,
        totalBlocked: totalBlockedForeign,
        totalInDatabase: finalResult.length
    };
}

crawlAndSaveToJSON();

// API XẢ 250 BÀI CHO APP TV
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 
    try {
        let liveVideos = [];
        if (fs.existsSync(FILE_PATH)) {
            liveVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        }

        const uniqueMap = new Map();
        liveVideos.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
        let finalPlayList = Array.from(uniqueMap.values());

        const excludeParam = req.query.exclude;
        if (excludeParam) {
            const excludedIds = excludeParam.split(',');
            finalPlayList = finalPlayList.filter(v => !excludedIds.includes(v.videoId));
        }

        finalPlayList = shuffle(finalPlayList);
        return res.json(finalPlayList.slice(0, count));
    } catch (e) { return res.json([]); }
});

// API TÌM KIẾM ĐỘNG
app.get('/api/video/search', async (req, res) => {
    const keyword = req.query.keyword;
    const count = parseInt(req.query.count) || 250; 
    if (!keyword) return res.json([]);
    try {
        const randomCursor = Math.floor(Math.random() * 8) * 10; 
        const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword.trim())}&count=${count}&cursor=${randomCursor}`;
        const response = await axios.get(targetUrl, { timeout: 12000 });
        if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
            let fetched = response.data.data.videos.map(v => {
                if (!isVietnameseContent(v.title || "")) return null; 
                return { 
                    videoId: v.video_id, 
                    videoUrl: v.play, 
                    title: v.title, 
                    cover: v.cover, 
                    views: v.play_count || 0, 
                    author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user", 
                    authorName: v.author?.nickname || "Người dùng Tóp Tóp",
                    avatar: v.author?.avatar || "https://www.w3schools.com/howto/img_avatar.png"
                };
            }).filter(v => v !== null);
            return res.json(shuffle(fetched));
        }
        return res.json([]);
    } catch (err) { return res.json([]); }
});

// API LẤY BÌNH LUẬN
app.get('/api/comment/list', async (req, res) => {
    const videoId = req.query.video_id;
    if (!videoId) return res.json({ code: -1, msg: "Thiếu tham số video_id!" });
    try {
        const response = await axios.get(`https://www.tikwm.com/api/comment/list?video_id=${videoId}&count=30`);
        return res.json(response.data);
    } catch (err) { return res.json({ code: -1, msg: err.message }); }
});

app.get('/api/crawl-more', async (req, res) => {
    const reportStats = await crawlAndSaveToJSON();
    res.json({ message: "Hệ thống bot vừa thực hiện quét kho video mới xong!", thong_ke_chi_tiet: reportStats });
});

// Cào tự động sau mỗi 45 phút
setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) { console.log("⚠️ Lỗi cập nhật tự động:", err.message); }
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Đa Thể Loại chính thức kích nổ thành công tại cổng ${PORT}`));
