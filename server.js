const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // 🔥 ĐÃ THÊM: Thư viện chống block CORS

// =======================================================================================
// 🌟 GIỮ NGUYÊN 100% BỘ TỪ KHÓA GỐC CỦA ÔNG GIÁO
// =======================================================================================
const keywordsDatabase = {
    hai_huoc_meme: [
        "review phim", "lốp", "Threads Việt Nam", "TikTok Việt Nam", 
        "fyp", "xuhuong", "biketok", "xh", "hate that i made you love me", 
        "Capcut Giật Giật", "viral", "xhtiktok", "BMW edit"
    ],
    am_thuc_vlog: [
        "review do an hot trend", "mukbang do an sieu ngon", 
        "vlog cuoc song hang ngay chill", "goc khuat cuoc song tam trang", 
        "podcast chữa lành tâm trạng ", "Chuỗi", "phong cảnh Việt Nam"
    ],
    audio_truyen: [
        "Audio Việt Nam", "Audio Tổng Tài", "Audio Thiên Kim"
    ],
    thoi_trang_trai_dep: [
        "Trai đẹp Việt Nam", "Trai đẹp Trung Quốc", "Trai đẹp Hàn Quốc"
    ],
    nhac_giat_giat: [
        "trend biến hình tiktok viet nam", "funk", "phonk", 
        "remix giat giat cuon", "vinahouse remix tiktok hot", 
        "mashup hot tiktok hien tai", "dance trend tiktok viet nam", 
        "trend nhảy tiktok hot", "nhạc căng đét tiktok", 
        "gái xinh nhảy edm hot", "vũ điệu cuốn hút tiktok"
    ],
    generic_xuhuong: [
        "Trend TikTok hiện tại", "BMW"
    ]
};

const categoryLimits = {
    hai_huoc_meme: 80,       
    am_thuc_vlog: 30,        
    audio_truyen: 10,        
    thoi_trang_trai_dep: 30,  
    nhac_giat_giat: 5,       
    generic_xuhuong: 80       
};

const app = express(); 
app.use(cors()); // 🔥 ĐÃ THÊM: Mở cửa cho mọi Client (TV, Web, Mobile) gọi API thoải mái

const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// 🔥 NGƯỠNG TIM TỐI THIỂU ĐỂ ĐƯỢC CÔNG NHẬN LÀ "HOT HIT"
const MIN_LIKES_THRESHOLD = 1500; 

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
    res.send(`🚀 Server TikTok TV - Kho RAM đang găm giữ: ${globalVideosCache.length} siêu phẩm cực hot.`);
});

// =======================================================================================
// 🌍 CƠ CHẾ BẢO VỆ LỚP KÉP - CHẶN NGOẠI BANG & LỌC FLOP
// =======================================================================================
function isGlobalKeyword(kw) {
    if (!kw) return false;
    const lower = kw.toLowerCase().trim();
    return [
        "phonk", "funk", "biketok", "dance trend", 
        "hate that i made you love me"
    ].some(g => lower.includes(g));
}

function isVietnameseContent(video, keyword = "") {
    const title = video.title || "";
    const region = (video.region || "").toUpperCase().trim();

    const hasForeignScript = /[\u4e00-\u9fa5]|[\uac00-\ud7af]|[\u3040-\u309f\u30a0-\u30ff]|[\u0e00-\u0e7f]|[\u0400-\u04ff]/.test(title);
    if (hasForeignScript) return false;

    if (region && region !== "VN" && !isGlobalKeyword(keyword)) {
        return false;
    }

    if (isGlobalKeyword(keyword)) return true;

    if (!title.trim()) {
        return region === "VN";
    }

    const lowerTitle = title.toLowerCase();
    const hasVnAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(title);
    if (hasVnAccents) return true;

    const hasVnKeywords = /\b(xh|xuhuong|fyp|capcut|remix|vinahouse|vietnam|vn|phim|truyen|haihuoc|amthuc|mukbang|vlog|review|traidep|gaixinh|bienhinh|giatgiat|chualanh|tamtrang|thuthuat|meo|vcl|vl|đm|clmm|ngau|dinh|top|hot|clip|bua|chuoi|phongcanh)\b/i.test(lowerTitle);
    const hasEnglishStops = /\b(the|and|this|that|with|from|your|have|for|just|like|when|what|here|about|they|them|girl|boy|guy|man|woman|cat|dog|challenge|today|night|love|beautiful|meme|cooking|food|recipe|tutorial|wfh|gym|workout|fitness|gaming|pc)\b/i.test(lowerTitle);

    if (hasEnglishStops && !hasVnKeywords) return false;
    if (!hasVnAccents && !hasVnKeywords) return false;

    return true; 
}

// 📡 TIẾN TRÌNH CÀO CUỐN CHIẾU - THIẾT QUÂN LUẬT KIỂM TRA LƯỢT TIM
async function crawlAndSaveToJSON() {
    if (isCrawling) {
        console.log("⏳ [HỆ THỐNG] Tiến trình cào đang chạy ngầm, bỏ qua lượt kích hoạt trùng lặp.");
        return { status: "Đang cào ngầm" };
    }
    
    isCrawling = true;
    console.log("\n🔄 [HỆ THỐNG] Khởi động chu kỳ quét sâu dữ liệu...");
    
    let totalFetchedFromAPI = 0;
    let totalValidVN = 0;
    let totalBlockedForeign = 0;
    let totalLowLikesSutBayMau = 0; 

    try {
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
                            
                            if (!isVietnameseContent(v, keyword)) {
                                totalBlockedForeign++;
                                return null; 
                            }

                            const currentLikes = v.digg_count || 0;
                            if (currentLikes < MIN_LIKES_THRESHOLD) {
                                totalLowLikesSutBayMau++;
                                return null;
                            }

                            totalValidVN++;

                            return {
                                videoId: v.video_id, video_id: v.video_id, id: v.video_id,
                                videoUrl: v.play, video_url: v.play, play: v.play,
                                title: v.title || "", cover: v.cover, views: v.play_count || 0, play_count: v.play_count || 0,
                                
                                digg_count: v.digg_count || 0,
                                diggCount: v.digg_count || 0,
                                likes: v.digg_count || 0,
                                like_count: v.digg_count || 0,
                                
                                comment_count: v.comment_count || 0, commentCount: v.comment_count || 0,
                                author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user",
                                authorName: v.author?.nickname || "Người dùng Tóp Tóp",
                                author_name: v.author?.nickname || "Người dùng Tóp Tóp",
                                avatar: v.author?.avatar || "https://www.w3schools.com/howto/img_avatar.png",
                                category: category 
                            };
                        }).filter(v => v !== null);

                        for (const video of fetched) {
                            if (keywordVideosFetched.length < maxLimitForThisKeyword) keywordVideosFetched.push(video);
                            else break;
                        }
                    }
                } catch (err) {
                    console.log(`⚠️ [LỖI TỪ KHÓA] Quét từ khóa "${keyword}" thất bại: ${err.message}`);
                }
            }
            
            if (keywordVideosFetched.length > 0) {
                const totalMerged = [...globalVideosCache, ...keywordVideosFetched];
                const uniqueMap = new Map();
                totalMerged.forEach(v => { if (v.video_id) uniqueMap.set(v.video_id, v); });
                globalVideosCache = shuffle(Array.from(uniqueMap.values())).slice(-5000);
                
                // 🔥 ĐÃ FIX: Chuyển sang Ghi file BẤT ĐỒNG BỘ (Async) để server không bị đứng hình
                const jsonData = JSON.stringify(globalVideosCache, null, 2);
                fs.writeFile(FILE_PATH, jsonData, (err) => {
                    if (err) {
                        console.log(`❌ [LỖI GHI FILE JSON]: ${err.message}`);
                    } else {
                        console.log(`💾 [BACKUP] Đã sao lưu ${globalVideosCache.length} video ra disk ngầm.`);
                    }
                });
            }
        }

        console.log(`\n==================================================`);
        console.log(`📊 [BÁO CÁO CHI TIẾT CHU KỲ QUÉT DỮ LIỆU VÀNG]`);
        console.log(`📥 Tổng số video tải về từ API gốc: ${totalFetchedFromAPI} clip.`);
        console.log(`✅ Hàng siêu hot hợp lệ được giữ lại: ${totalValidVN} clip.`);
        console.log(`🚫 Số lượng video nước ngoài bị chặn: ${totalBlockedForeign} clip.`);
        console.log(`🗑️ Số lượng video "ít tim, flop" bị sút bay màu: ${totalLowLikesSutBayMau} clip.`);
        console.log(`💾 Tổng kho RAM sở hữu toàn siêu phẩm: ${globalVideosCache.length} clip.`);
        console.log(`==================================================\n`);

        return { 
            status: "Thành công!", 
            totalInDatabase: globalVideosCache.length,
            fetched: totalFetchedFromAPI,
            valid: totalValidVN,
            blocked: totalBlockedForeign,
            purgedFlop: totalLowLikesSutBayMau
        };

    } catch (globalErr) {
        console.log(`🚨 [SẬP TIẾN TRÌNH] Lỗi hệ thống nghiêm trọng: ${globalErr.message}`);
        return { status: "Thất bại", error: globalErr.message };
    } finally {
        isCrawling = false;
        console.log("🔓 [HỆ THỐNG] Đã giải phóng bùa phong ấn isCrawling thành công!");
    }
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

// 📺 API XẢ BÀI ĐỘC QUYỀN - 🔥 ĐÃ NÂNG CẤP THUẬT TOÁN FYP ĐAN RỔ XEN KẼ TỰ NHIÊN
app.get(['/api/video', '/api/category'], (req, res) => {
    const count = parseInt(req.query.count) || 250; 
    const reqCategory = req.query.category; 

    if (globalVideosCache.length === 0) return res.json([]);

    let tempPool = [...globalVideosCache];

    // Loại bỏ các video trùng lặp nếu phía client có gửi danh sách loại trừ
    const excludeParam = req.query.exclude;
    if (excludeParam) {
        const excludedIds = excludeParam.split(',');
        tempPool = tempPool.filter(v => !excludedIds.includes(v.video_id) && !excludedIds.includes(v.videoId));
    }

    let servedVideos = [];

    // 🔥 TRƯỜNG HỢP 1: XEM TAB CHÍNH ("DÀNH CHO BẠN" HOẶC KHÔNG TRUYỀN CATEGORY) -> ĐAN RỔ THÔNG MINH
    if (!reqCategory || reqCategory === "Dành cho bạn" || reqCategory === "All") {
        
        // 1. Phân loại video hiện có trong kho RAM vào các ngăn chứa danh mục riêng lẻ
        const categoriesMap = {};
        tempPool.forEach(v => {
            const cat = v.category || "generic_xuhuong";
            if (!categoriesMap[cat]) categoriesMap[cat] = [];
            categoriesMap[cat].push(v);
        });

        // 2. Sắp xếp video trong từng ngăn theo thứ tự TIM giảm dần (Ưu tiên siêu phẩm lên trước)
        for (const cat in categoriesMap) {
            categoriesMap[cat].sort((a, b) => {
                const likesA = a.digg_count || a.likes || 0;
                const likesB = b.digg_count || b.likes || 0;
                return likesB - likesA;
            });
        }

        // 3. Tiến hành bốc Round-Robin: Lấy luân phiên từng video đầu bảng của mỗi danh mục đan xen vào nhau
        const catKeys = Object.keys(categoriesMap);
        let dynamicCheck = true;

        while (dynamicCheck && servedVideos.length < count) {
            dynamicCheck = false; // Mặc định vòng này tạm coi là cạn bài
            
            for (const cat of catKeys) {
                if (categoriesMap[cat] && categoriesMap[cat].length > 0) {
                    servedVideos.push(categoriesMap[cat].shift());
                    dynamicCheck = true; // Xác nhận vẫn bốc được bài để chạy tiếp vòng sau
                }
                if (servedVideos.length >= count) break; // Đạt đủ số lượng app TV cần thì dừng bài
            }
        }
    } 
    // 📺 TRƯỜNG HỢP 2: NGƯỜI DÙNG XEM TAB RIÊNG BIỆT (HÀI HƯỚC, ÂM NHẠC, ẨM THỰC...)
    else {
        let targetKey = "";
        if (reqCategory === "Hài hước" || reqCategory === "Phim & TV") targetKey = "hai_huoc_meme";
        else if (reqCategory === "Ẩm thực") targetKey = "am_thuc_vlog";
        else if (reqCategory === "Âm nhạc") targetKey = "nhac_giat_giat";
        
        if (targetKey) {
            tempPool = tempPool.filter(v => v.category === targetKey);
        }

        // Xếp hạng tim từ cao xuống thấp của riêng danh mục đó rồi cắt lấy đủ số lượng
        tempPool.sort((a, b) => (b.digg_count || b.likes || 0) - (a.digg_count || a.likes || 0));
        servedVideos = tempPool.slice(0, count);
    }

    // Đánh dấu xóa các bài đã phân phối ra khỏi kho RAM chính để tránh trùng lặp ở lần sau
    const servedIds = servedVideos.map(v => v.video_id);
    globalVideosCache = globalVideosCache.filter(v => !servedIds.includes(v.video_id));

    console.log(`🎟️ [THUẬT TOÁN FYP ĐAN RỔ] Đã phân phối ${servedVideos.length} bài trộn xen kẽ tự nhiên. RAM còn lại: ${globalVideosCache.length} bài.`);

    if (globalVideosCache.length < 600) crawlAndSaveToJSON();
    return res.json(servedVideos);
});

// 💬 API BÌNH LUẬN VẠN NĂNG - ĐÃ SẮP XẾP BÌNH LUẬN HOT NHẤT LÊN ĐẦU
app.get('/api/comment/list', async (req, res) => {
    let videoId = req.query.video_id || req.query.id || req.query.videoId;
    if (!videoId || videoId === 'undefined' || videoId === 'null') {
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
        if (commentsArray.length > 0) {
            commentsArray.sort((a, b) => {
                const likesA = a.digg_count || a.diggCount || 0;
                const likesB = b.digg_count || b.diggCount || 0;
                return likesB - likesA;
            });
        }
        return res.json({ code: 0, msg: "success", comments: commentsArray, data: { comments: commentsArray }, list: commentsArray });
    } catch (err) { 
        return res.json({ code: -1, msg: err.message, comments: [], data: { comments: [] } }); 
    }
});

// 🔥 API TÌM KIẾM ĐỘNG - ĐÃ FIX THEO TIÊU CHUẨN LỌC HÀNG HOT 
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
                if (!isVietnameseContent(v, keyword)) return null; 
                if ((v.digg_count || 0) < MIN_LIKES_THRESHOLD) return null;

                return { 
                    videoId: v.video_id, video_id: v.video_id, id: v.video_id,
                    videoUrl: v.play, video_url: v.play, play: v.play,
                    title: v.title, cover: v.cover, views: v.play_count || 0, play_count: v.play_count || 0,
                    digg_count: v.digg_count || 0, diggCount: v.digg_count || 0, likes: v.digg_count || 0, like_count: v.digg_count || 0,
                    comment_count: v.comment_count || 0, commentCount: v.comment_count || 0,
                    author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user", 
                    authorName: v.author?.nickname || "Người dùng Tóp Tóp", author_name: v.author?.nickname || "Người dùng Tóp Tóp",
                    avatar: v.author?.avatar || "https://www.w3schools.com/howto/img_avatar.png"
                };
            }).filter(v => v !== null);

            fetched.sort((a, b) => b.digg_count - a.digg_count);
            return res.json(fetched);
        }
        return res.json([]);
    } catch (err) { return res.json([]); }
});

app.get('/api/crawl-more', async (req, res) => {
    const reportStats = await crawlAndSaveToJSON();
    res.json({ message: "Đang ép bot cào cuốn chiếu tuyển chọn hàng khủng!", thong_tin: reportStats });
});

setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) {}
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Tuyệt Diệt Flop & Thuật Toán FYP Đan Rổ Thông Minh chạy tại cổng ${PORT}`));
