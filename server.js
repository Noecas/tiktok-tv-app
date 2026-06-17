const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =======================================================================================
// 🌟 GIỮ NGUYÊN 100% BỘ TỪ KHÓA GỐC CỦA ÔNG GIÁO
// =======================================================================================
const keywordsDatabase = {
    hai_huoc_meme: [
        "review phim", "Threads Việt Nam", "TikTok Việt Nam", 
        "fyp", "xuhuong", "biketok", "xh", "hate that i made you love me", 
        "Capcut Giật Giật", "viral"
    ],
    am_thuc_vlog: [
        "review do an hot trend", "mukbang do an sieu ngon", 
        "vlog cuoc song hang ngay chill", "goc khuat cuoc song tam trang", 
        "podcast chữa lành tâm trạng ", "Chuỗi", "Lốp"
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

const app = express(); 
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// KHO BỘ NHỚ ĐỆM LIVE (RAM CACHE)
let globalVideosCache = [];

function shuffle(array) {
    if (!Array.isArray(array)) return array;
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

app.get('/', (req, res) => {
    res.send(`🚀 Server TikTok TV - Live Cache: ${globalVideosCache.length} clip.`);
});

// =======================================================================================
// 🌟 BỘ LỌC CHUẨN: VIỆT NAM THẢ CỬA, TRUNG/HÀN LỌT LƯỚI 25%
// =======================================================================================
function isVietnameseContent(title) {
    if (!title) return true; 

    const hasChinese = /[\u4e00-\u9fa5]/.test(title);
    const hasKorean = /[\uac00-\ud7af]/.test(title);
    
    if (hasChinese || hasKorean) {
        return Math.random() < 0.25; // Lâu lâu mới cho lọt lưới 25%
    }
    return true; 
}

// 📡 TIẾN TRÌNH CÀO - QUẾT TỪ NÀO NHÉT THẲNG VÀO LINK API TỪ ĐÓ!
async function crawlAndSaveToJSON() {
    console.log("\n🔄 [HỆ THỐNG] Bắt đầu tiến trình quét cuốn chiếu...");
    
    let totalFetchedFromAPI = 0;
    let totalValidVN = 0;
    let totalBlockedForeign = 0;

    let selectedKeywords = [];
    for (const category in keywordsDatabase) {
        const shuffledCatKeywords = shuffle([...keywordsDatabase[category]]);
        const picked = shuffledCatKeywords.slice(0, 4).map(kw => ({ text: kw, category: category }));
        selectedKeywords = [...selectedKeywords, ...picked];
    }
    
    selectedKeywords = shuffle(selectedKeywords);

    // Vòng lặp quét từng từ khóa một
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
            } catch (err) { /* Bỏ qua lỗi mạng nhỏ */ }
        }
        
        console.log(`🔎 [${category.toUpperCase()}] Từ khóa: "${keyword}" -> Tìm thấy: ${kwTotalFetched} | Giữ lại: ${kwKept} | Loại bỏ: ${kwBlocked} -> Gom thực tế: ${keywordVideosFetched.length} bài.`);

        // 🔥 Ý ÔNG GIÁO: CÓ HÀNG LÀ NHÉT THẲNG VÀO API / LỌC TRÙNG / TRỘN XÀ QUẦN LUÔN KHÔNG CHỜ ĐỢI!
        if (keywordVideosFetched.length > 0) {
            // Lấy kho hiện tại đang có sẵn trong RAM ra gộp luôn
            const totalMerged = [...globalVideosCache, ...keywordVideosFetched];
            
            // Tiến hành lọc trùng ID ngay tại trận
            const uniqueMap = new Map();
            totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
            
            let finalResult = Array.from(uniqueMap.values());
            
            // Cắt gọn kho tối đa 5000 bài + Trộn xà quần lần 1
            globalVideosCache = shuffle(finalResult).slice(-5000);

            // Ghi đè file JSON dự phòng để lưu lại thành quả
            try {
                fs.writeFileSync(FILE_PATH, JSON.stringify(globalVideosCache, null, 2));
            } catch (e) { console.log("⚠️ Lỗi lưu file backup"); }
            
            console.log(`⚡ [LIVE PUSH] Đã bơm trực tiếp ${keywordVideosFetched.length} clip vào thẳng link api/video!`);
        }
    }

    console.log(`\n📊 [HOÀN THÀNH VÒNG QUÉT CHU KỲ] Kho RAM hiện tại đang sở hữu: ${globalVideosCache.length} bài.`);
    return { status: "Thành công!", totalInDatabase: globalVideosCache.length };
}

// Khởi động nạp kho khi server vừa bật
function initCacheOnBoot() {
    try {
        if (fs.existsSync(FILE_PATH)) {
            const data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (Array.isArray(data)) globalVideosCache = shuffle(data);
        }
    } catch (e) { globalVideosCache = []; }
    crawlAndSaveToJSON();
}
initCacheOnBoot();

// =======================================================================================
// 📺 API XẢ BÀI CHO APP TV - SIÊU TỐC - TRỘN XÀ QUẦN LẦN 2 TRƯỚC KHI TRẢ VỀ
// =======================================================================================
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 
    if (globalVideosCache.length === 0) return res.json([]);

    let finalPlayList = [...globalVideosCache];

    // Loại trừ video đã xem
    const excludeParam = req.query.exclude;
    if (excludeParam) {
        const excludedIds = excludeParam.split(',');
        finalPlayList = finalPlayList.filter(v => !excludedIds.includes(v.videoId));
    }

    // 🔥 TRỘN XÀ QUẦN LẦN THỨ 2 TRƯỚC KHI TRẢ VỀ CHO APP XEM CHO CUỐN
    finalPlayList = shuffle(finalPlayList);
    
    return res.json(finalPlayList.slice(0, count));
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
    res.json({ message: "Đang tiến hành cào cuốn chiếu trực tiếp vào API!", thong_ke: reportStats });
});

// Tự động quét cập nhật sau mỗi 45 phút
setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) { console.log("⚠️ Lỗi cập nhật tự động:", err.message); }
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Đa Thể Loại Siêu Tốc Cuốn Chiếu hoạt động tại cổng ${PORT}`));
