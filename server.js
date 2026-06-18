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
        "podcast chữa lành tâm trạng ", "Chuỗi", "phong cảnh"
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

// 📡 TIẾN TRÌNH CÀO CUỐN CHIẾU - ĐÃ BỌC LÓT ĐA CẤU TRÚC BIẾN
async function crawlAndSaveToJSON() {
    if (isCrawling) return { status: "Đang cào ngầm" };
    isCrawling = true;
    console.log("\n🔄 [HỆ THỐNG] Khởi động chu kỳ quét sâu dữ liệu...");
    
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
                        if (!isVietnameseContent(v.title || "")) {
                            totalBlockedForeign++;
                            return null; 
                        }
                        totalValidVN++;

                        // 🔥 ĐÒN BỌC LÓT CHÍ MẠNG: Đẻ ra cả dạng snake_case lẫn camelCase để chặn đứng lỗi Undefined ID
                        return {
                            videoId: v.video_id,
                            video_id: v.video_id,
                            id: v.video_id,

                            videoUrl: v.play,
                            video_url: v.play,
                            play: v.play,

                            title: v.title || "",
                            cover: v.cover,
                            views: v.play_count || 0,
                            play_count: v.play_count || 0,
                            author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user",
                            authorName: v.author?.nickname || "Người dùng Tóp Tóp",
                            author_name: v.author?.nickname || "Người dùng Tóp Tóp",
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
        
        if (keywordVideosFetched.length > 0) {
            const totalMerged = [...globalVideosCache, ...keywordVideosFetched];
            const uniqueMap = new Map();
            totalMerged.forEach(v => { if (v.video_id) uniqueMap.set(v.video_id, v); });
            globalVideosCache = shuffle(Array.from(uniqueMap.values())).slice(-5000);
            try { fs.writeFileSync(FILE_PATH, JSON.stringify(globalVideosCache, null, 2)); } catch (e) {}
        }
    }

    console.log(`📊 [TỔNG KẾT] Kho RAM live găm giữ vững chắc: ${globalVideosCache.length} clip.`);
    isCrawling = false;
    return { status: "Thành công!", totalInDatabase: globalVideosCache.length };
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

// 📺 API XẢ BÀI ĐỘC QUYỀN - CƠ CHẾ XẢ KHO HÀNH QUYẾT
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 
    if (globalVideosCache.length === 0) return res.json([]);

    let tempPool = [...globalVideosCache];
    const excludeParam = req.query.exclude;
    if (excludeParam) {
        const excludedIds = excludeParam.split(',');
        // Lọc loại trừ linh hoạt cả 2 đầu ID
        tempPool = tempPool.filter(v => !excludedIds.includes(v.video_id) && !excludedIds.includes(v.videoId));
    }

    tempPool = shuffle(tempPool);
    let servedVideos = tempPool.slice(0, count);
    const servedIds = servedVideos.map(v => v.video_id);
    
    // Tuyệt diệt trùng bài tận gốc trên RAM
    globalVideosCache = globalVideosCache.filter(v => !servedIds.includes(v.video_id));

    console.log(`🎟️ [API XẢ KHO] Tiễn biệt ${servedVideos.length} bài. RAM còn lại: ${globalVideosCache.length} bài.`);

    if (globalVideosCache.length < 600) crawlAndSaveToJSON();
    return res.json(servedVideos);
});

// =======================================================================================
// 💬 API BÌNH LUẬN VẠN NĂNG - THIẾT LẬP BẢO HIỂM LỒNG CHỐNG "UNDEFINED"
// =======================================================================================
app.get('/api/comment/list', async (req, res) => {
    // Thu thập mọi biến thể tham số đầu vào từ App TV gửi lên
    let videoId = req.query.video_id || req.query.id || req.query.videoId;

    // 🚨 BẮT QUẢ TANG: Nếu App TV truyền lên chuỗi chữ "undefined" do sai key
    if (!videoId || videoId === 'undefined' || videoId === 'null') {
        console.log(`🚨 [API COMMENTS CẢNH BÁO] App TV gửi lên ID video bị lỗi chuỗi: "${videoId}". Đã kích hoạt cấu trúc bọc lót kép để sửa lỗi!`);
        return res.json({ code: 0, msg: "success", comments: [], data: { comments: [] } });
    }

    try {
        const targetUrl = `https://www.tikwm.com/api/comment/list?id=${videoId}&count=50&cursor=0`;
        const response = await axios.get(targetUrl, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        let commentsArray = [];
        if (response.data && response.data.data && Array.isArray(response.data.data.comments)) {
            commentsArray = response.data.data.comments;
        } else if (response.data && Array.isArray(response.data.comments)) {
            commentsArray = response.data.comments;
        }

        console.log(`💬 [COMMENTS] Clip ${videoId} -> Hút thành công: ${commentsArray.length} bình luận.`);

        // 🔥 PHÁT LỆNH VẠN NĂNG: Trả về mọi kiểu cấu trúc để App đọc kiểu gì cũng trúng
        return res.json({
            code: 0,
            msg: "success",
            comments: commentsArray,       // Kiểu phẳng trực tiếp
            data: {
                comments: commentsArray     // Kiểu lồng mặc định TikWM
            },
            list: commentsArray             // Kiểu mảng dự phòng bổ sung
        });
    } catch (err) { 
        return res.json({ code: -1, msg: err.message, comments: [], data: { comments: [] } }); 
    }
});

// API TÌM KIẾM ĐỘNG - CŨNG ĐƯỢC BẢO HIỂM BIẾN DUAL
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
                    videoId: v.video_id, video_id: v.video_id, id: v.video_id,
                    videoUrl: v.play, video_url: v.play, play: v.play,
                    title: v.title, cover: v.cover, views: v.play_count || 0, play_count: v.play_count || 0,
                    author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user", 
                    authorName: v.author?.nickname || "Người dùng Tóp Tóp", author_name: v.author?.nickname || "Người dùng Tóp Tóp",
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

app.listen(PORT, () => console.log(`🚀 Server Tuyệt Diệt Trùng Bài & Bảo Hiểm Cấu Trúc Kép chạy tại cổng ${PORT}`));
