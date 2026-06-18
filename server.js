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
let isCrawling = false; 

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

function isVietnameseContent(title) {
    if (!title) return true; 
    const hasChinese = /[\u4e00-\u9fa5]/.test(title);
    const hasKorean = /[\uac00-\ud7af]/.test(title);
    if (hasChinese || hasKorean) return Math.random() < 0.25; 
    return true; 
}

// 📡 TIẾN TRÌNH CÀO CUỐN CHIẾU VỚI HỆ THỐNG BÁO CÁO SIÊU CHI TIẾT
async function crawlAndSaveToJSON() {
    if (isCrawling) {
        console.log("⏳ [BOT] Tiến trình cào trước đó chưa xong, lượt quét này tạm hoãn để tránh thắt nút cổ chai.");
        return { status: "Đang cào ngầm" };
    }
    isCrawling = true;
    console.log("\n🔄 [HỆ THỐNG] Kích hoạt chu kỳ quét sâu - Báo cáo logs thời gian thực...");
    
    let oldVideos = [];
    try {
        if (fs.existsSync(FILE_PATH)) {
            oldVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
            if (!Array.isArray(oldVideos)) oldVideos = [];
        }
    } catch (e) { oldVideos = []; }

    // Biến đếm tổng cho toàn bộ chu kỳ quét
    let totalFetchedFromAPI = 0;
    let totalValidVN = 0;
    let totalBlockedForeign = 0;

    let selectedKeywords = [];
    for (const category in keywordsDatabase) {
        const shuffledCatKeywords = shuffle([...keywordsDatabase[category]]);
        const picked = shuffledCatKeywords.slice(0, 7).map(kw => ({ text: kw, category: category }));
        selectedKeywords = [...selectedKeywords, ...picked];
    }
    
    selectedKeywords = shuffle(selectedKeywords);

    for (const item of selectedKeywords) {
        const keyword = item.text.trim();
        const category = item.category;
        const maxLimitForThisKeyword = categoryLimits[category] || 30; 

        let keywordVideosFetched = []; 
        let kwTotalFetched = 0;
        let kwKept = 0;
        let kwBlocked = 0;

        const pageCursors = [Math.floor(Math.random() * 25) * 10, Math.floor(Math.random() * 25 + 25) * 10];

        for (const randomCursor of pageCursors) {
            if (keywordVideosFetched.length >= maxLimitForThisKeyword) break;
            try {
                await new Promise(resolve => setTimeout(resolve, 1000)); 
                const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}&_r=${Math.random()}`;
                const response = await axios.get(targetUrl, { 
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });

                if (response.data && response.data.code === 0 && response.data.data && Array.isArray(response.data.data.videos)) {
                    const fetched = response.data.data.videos.map(v => {
                        totalFetchedFromAPI++;
                        kwTotalFetched++;

                        if (!isVietnameseContent(v.title || "")) {
                            totalBlockedForeign++;
                            kwBlocked++;
                            return null; 
                        }
                        totalValidVN++;
                        kwKept++;

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
                        if (keywordVideosFetched.length < maxLimitForThisKeyword) keywordVideosFetched.push(video);
                        else break;
                    }
                }
            } catch (err) {}
        }
        
        // 📊 BÁO CÁO CHI TIẾT TỪNG TỪ KHÓA LÊN RENDER LOGS
        console.log(`🔎 [${category.toUpperCase()}] Từ khóa: "${keyword}" -> Tìm thấy: ${kwTotalFetched} | Giữ lại: ${kwKept} | Loại bỏ: ${kwBlocked} -> Gom thực tế: ${keywordVideosFetched.length} bài.`);

        // Bơm cuốn chiếu thẳng cánh vào RAM
        if (keywordVideosFetched.length > 0) {
            const totalMerged = [...globalVideosCache, ...keywordVideosFetched];
            const uniqueMap = new Map();
            totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
            
            globalVideosCache = shuffle(Array.from(uniqueMap.values())).slice(-5000);
            
            try { fs.writeFileSync(FILE_PATH, JSON.stringify(globalVideosCache, null, 2)); } catch (e) {}
            console.log(`   ⚡ [LIVE PUSH] Đã đồng bộ và trộn xà quần thêm ${keywordVideosFetched.length} clip vào API.`);
        }
    }

    // 📊 BẢNG TỔNG KẾT TOÀN DIỆN CUỐI CHU KỲ CÀO
    console.log(`\n📊 ========================================================`);
    console.log(`📊 [THỐNG KÊ HOÀN THÀNH TIẾN TRÌNH CÀO VIDEO TREND]`);
    console.log(`   - 🔎 Tổng số video đã quét qua API   : ${totalFetchedFromAPI} clip`);
    console.log(`   - ✅ Số clip HỢP LỆ được thông qua   : ${totalValidVN} clip`);
    console.log(`   - ❌ Số clip ngoại bang bị lọc bỏ    : ${totalBlockedForeign} clip`);
    console.log(`   - 💾 TỔNG KHO RAM HIỆN TẠI ĐANG CÓ   : ${globalVideosCache.length} clip (Sạch trùng - Sẵn sàng xả)`);
    console.log(`========================================================\n`);

    isCrawling = false;
    return { 
        status: "Thành công!", 
        totalFetched: totalFetchedFromAPI,
        totalValid: totalValidVN,
        totalInDatabase: globalVideosCache.length 
    };
}

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
// 📺 API XẢ BÀI ĐỘC QUYỀN - CƠ CHẾ XẢ KHO HÀNH QUYẾT + BÁO CÁO ĐẦY ĐỦ
// =======================================================================================
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 
    if (globalVideosCache.length === 0) {
        console.log("🚨 [API CẢNH BÁO] App TV gọi lấy bài nhưng kho RAM trống rỗng!");
        return res.json([]);
    }

    let tempPool = [...globalVideosCache];
    const excludeParam = req.query.exclude;
    if (excludeParam) {
        const excludedIds = excludeParam.split(',');
        tempPool = tempPool.filter(v => !excludedIds.includes(v.videoId));
    }

    tempPool = shuffle(tempPool);
    let servedVideos = tempPool.slice(0, count);
    const servedIds = servedVideos.map(v => v.videoId);
    
    // 💥 Cắt đuôi xóa bài khỏi RAM gốc luôn
    globalVideosCache = globalVideosCache.filter(v => !servedIds.includes(v.videoId));

    // 📊 BÁO CÁO HOẠT ĐỘNG XẢ KHO KHÔNG SỢ TRÙNG BÀI
    console.log(`🎟️ [API XẢ BÀI] Đã đóng gói tiễn biệt ${servedVideos.length} clip lên TV. Kho RAM hiện tại còn đúng: ${globalVideosCache.length} clip.`);

    if (globalVideosCache.length < 600) {
        console.log("⚠️ [RAM CHẠM ĐÁY] Số lượng tồn kho thấp hơn 600 bài! Kích hoạt bot cào bù hàng khẩn cấp...");
        crawlAndSaveToJSON();
    }
    return res.json(servedVideos);
});

// =======================================================================================
// 💬 API BÌNH LUẬN VẠN NĂNG - KÈM BÁO CÁO KIỂM SOÁT
// =======================================================================================
app.get('/api/comment/list', async (req, res) => {
    const videoId = req.query.video_id || req.query.id;
    if (!videoId) return res.json({ code: -1, msg: "Thiếu tham số!", comments: [] });

    console.log(`💬 [API COMMENTS] Đang truy vấn danh sách bình luận cho clip ID: ${videoId}`);
    try {
        const targetUrl = `https://www.tikwm.com/api/comment/list?id=${videoId}&count=50&cursor=0`;
        const response = await axios.get(targetUrl, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        let outputData = { ...response.data };
        if (outputData.data && Array.isArray(outputData.data.comments)) {
            outputData.comments = outputData.data.comments; 
            console.log(`   ✅ Tải thành công ${outputData.comments.length} bình luận cho clip ${videoId}`);
        } else {
            outputData.comments = [];
            console.log(`   ℹ️ Clip ${videoId} không có bình luận nào hoặc API chặn.`);
        }

        return res.json(outputData);
    } catch (err) { 
        console.log(`⚠️ Lỗi lấy bình luận của clip ${videoId}:`, err.message);
        return res.json({ code: -1, msg: err.message, comments: [] }); 
    }
});

// API TÌM KIẾM ĐỘNG
app.get('/api/video/search', async (req, res) => {
    const keyword = req.query.keyword;
    const count = parseInt(req.query.count) || 250; 
    if (!keyword) return res.json([]);
    console.log(`🔎 [API SEARCH] Người dùng tìm kiếm từ khóa: "${keyword}"`);
    try {
        const randomCursor = Math.floor(Math.random() * 30) * 10; 
        const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword.trim())}&count=${count}&cursor=${randomCursor}`;
        const response = await axios.get(targetUrl, { timeout: 12000 });
        if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
            let fetched = response.data.data.videos.map(v => {
                if (!isVietnameseContent(v.title || "")) return null; 
                return { 
                    videoId: v.video_id, videoUrl: v.play, title: v.title, cover: v.cover, views: v.play_count || 0, 
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

app.get('/api/crawl-more', async (req, res) => {
    const reportStats = await crawlAndSaveToJSON();
    res.json({ message: "Đang ép bot cào cuốn chiếu!", thong_tin: reportStats });
});

setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) {}
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Tuyệt Diệt Trùng Bài & Hệ Thống Logs Toàn Diện kích nổ tại cổng ${PORT}`));
