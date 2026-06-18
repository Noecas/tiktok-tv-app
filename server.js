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

const app = express(); 
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// KHO BỘ NHỚ ĐỆM LIVE (RAM CACHE)
let globalVideosCache = [];
let isCrawling = false; // Cờ chặn trùng tiến trình cào ngầm

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
    res.send(`🚀 Server TikTok TV - Kho RAM hiện tại còn: ${globalVideosCache.length} clip độc nhất.`);
});

// =======================================================================================
// 🌟 BỘ LỌC: VIỆT NAM THẢ CỬA, TRUNG/HÀN LỌT LƯỚI NGẪU NHIÊN 25%
// =======================================================================================
function isVietnameseContent(title) {
    if (!title) return true; 
    const hasChinese = /[\u4e00-\u9fa5]/.test(title);
    const hasKorean = /[\uac00-\ud7af]/.test(title);
    
    if (hasChinese || hasKorean) {
        return Math.random() < 0.25; 
    }
    return true; 
}

// 📡 TIẾN TRÌNH CÀO CUỐN CHIẾU - ĐÀO CỰC SÂU - BƠM TRỰC TIẾP LÊN RAM
async function crawlAndSaveToJSON() {
    if (isCrawling) {
        console.log("⏳ [BOT] Một tiến trình cào đang chạy rồi, bỏ qua lượt này.");
        return { status: "Đang cào ngầm" };
    }
    isCrawling = true;
    console.log("\n🔄 [HỆ THỐNG] Bắt đầu kích nổ vòng cào sâu lòng đất...");
    
    let oldVideos = [];
    try {
        if (fs.existsSync(FILE_PATH)) {
            oldVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (!Array.isArray(oldVideos)) oldVideos = [];
        }
    } catch (e) { oldVideos = []; }

    let selectedKeywords = [];
    for (const category in keywordsDatabase) {
        const shuffledCatKeywords = shuffle([...keywordsDatabase[category]]);
        // 🔥 TĂNG ĐẬM: Bốc hẳn 7 từ khóa/danh mục để đa dạng hóa nội dung tức thì
        const picked = shuffledCatKeywords.slice(0, 7).map(kw => ({ text: kw, category: category }));
        selectedKeywords = [...selectedKeywords, ...picked];
    }
    
    selectedKeywords = shuffle(selectedKeywords);

    for (const item of selectedKeywords) {
        const keyword = item.text.trim();
        const category = item.category;
        const maxLimitForThisKeyword = categoryLimits[category] || 30; 

        let keywordVideosFetched = []; 

        // 🔥 ĐÒN TRỪNG PHẠT: Ép cursor nhảy cực rộng từ 0 đến 500 để đào sâu clip cũ, clip lạ
        const pageCursors = [
            Math.floor(Math.random() * 25) * 10,       // Lượt 1: Tiêu điểm từ 0 -> 240
            Math.floor(Math.random() * 25 + 25) * 10  // Lượt 2: Tiêu điểm sâu từ 250 -> 490
        ];

        for (const randomCursor of pageCursors) {
            if (keywordVideosFetched.length >= maxLimitForThisKeyword) break;

            try {
                await new Promise(resolve => setTimeout(resolve, 1000)); 
                const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}&_r=${Math.random()}`;
                
                const response = await axios.get(targetUrl, { 
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
                });

                if (response.data && response.data.code !== 0) continue;

                if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                    const fetched = response.data.data.videos.map(v => {
                        if (!isVietnameseContent(v.title || "")) return null; 
                        
                        return {
                            videoId: v.video_id,
                            videoUrl: v.play,
                            title: v.title || "",
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
            } catch (err) { /* Bỏ qua lỗi kết nối mạng */ }
        }
        
        // 🔥 GỘP VÀO RAM VÀ TRỘN XÀ QUẦN LẬP TỨC CHO TỪNG TỪ KHÓA
        if (keywordVideosFetched.length > 0) {
            const totalMerged = [...globalVideosCache, ...keywordVideosFetched];
            const uniqueMap = new Map();
            totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
            
            let finalResult = Array.from(uniqueMap.values());
            // Giữ trần kho RAM ở mức 5000 clip để tránh tràn bộ nhớ Render
            globalVideosCache = shuffle(finalResult).slice(-5000);

            // Ghi file JSON dự phòng cứu hộ
            try { fs.writeFileSync(FILE_PATH, JSON.stringify(globalVideosCache, null, 2)); } catch (e) {}
            console.log(`⚡ [LIVE PUSH] Đã bơm ${keywordVideosFetched.length} clip độc lạ từ từ khóa "${keyword}" vào thẳng API link!`);
        }
    }

    console.log(`\n📊 [HOÀN THÀNH CHU KỲ CÀO SÂU] Tổng kho RAM đang găm: ${globalVideosCache.length} bài sạch bóng trùng lặp.`);
    isCrawling = false;
    return { status: "Thành công!", totalInDatabase: globalVideosCache.length };
}

// Khởi động nạp kho khi server vừa bật dậy
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
// 📺 API XẢ BÀI ĐỘC QUYỀN - CƠ CHẾ XẢ KHO HÀNH QUYẾT (ĂN ĐẾN ĐÂU XÓA ĐẾN ĐẤY)
// =======================================================================================
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 
    if (globalVideosCache.length === 0) return res.json([]);

    // Lọc loại trừ video cũ (nếu app vẫn truyền tham số loại trừ lên)
    let tempPool = [...globalVideosCache];
    const excludeParam = req.query.exclude;
    if (excludeParam) {
        const excludedIds = excludeParam.split(',');
        tempPool = tempPool.filter(v => !excludedIds.includes(v.videoId));
    }

    // Lắc xúc xắc trộn xà quần một lần nữa cho chắc cốp
    tempPool = shuffle(tempPool);

    // 🔥 ĐÒN CHÍ MẠNG: Cắt ngọt phăng 'count' bài ra khỏi kho RAM gốc luôn!
    // Lấy danh sách ID của số clip sắp xuất xưởng này để xóa hoàn toàn trong globalVideosCache
    let servedVideos = tempPool.slice(0, count);
    const servedIds = servedVideos.map(v => v.videoId);
    globalVideosCache = globalVideosCache.filter(v => !servedIds.includes(v.videoId));

    console.log(`🎟️ [API] Đã xuất xưởng ${servedVideos.length} clip. Kho RAM hiện còn lại: ${globalVideosCache.length} bài chờ lượt.`);

    // 🚨 CƠ CHẾ TỰ ĐỘNG BÙ HÀNG: Nếu kho RAM bị app hốc bạo quá tụt xuống dưới 600 bài, tự động gọi bot cào bù ngầm ngay!
    if (globalVideosCache.length < 600) {
        console.log("⚠️ [RAM CẢNH BÁO] Kho bài sắp cạn đáy! Tự động ra lệnh cho bot cào bù kho ngầm...");
        crawlAndSaveToJSON(); // Chạy bất đồng bộ ngầm không làm nghẽn mạng của App TV
    }
    
    return res.json(servedVideos);
});

// API TÌM KIẾM ĐỘNG
app.get('/api/video/search', async (req, res) => {
    const keyword = req.query.keyword;
    const count = parseInt(req.query.count) || 250; 
    if (!keyword) return res.json([]);
    try {
        const randomCursor = Math.floor(Math.random() * 30) * 10; 
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
    res.json({ message: "Đang ép lệnh cho hệ thống đào sâu cào ngầm cuốn chiếu!", thong_tin: reportStats });
});

// Tự động quét cập nhật sau mỗi 45 phút
setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) { console.log("⚠️ Lỗi cập nhật tự động:", err.message); }
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Tuyệt Diệt Trùng Bài đã được kích hoạt tại cổng ${PORT}`));
