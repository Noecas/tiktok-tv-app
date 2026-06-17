const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =======================================================================================
// 🌟 PHÂN CHIA CHÍNH XÁC TỪ KHÓA ĐỂ THIẾT LẬP HẠN NGẠCH
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
    hai_huoc_meme: 60,       
    am_thuc_vlog: 15,        
    audio_truyen: 20,       
    thoi_trang_trai_dep: 10,  
    nhac_giat_giat: 5,       
    generic_xuhuong: 30       
};

const app = express(); 
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
    res.send("🚀 Server TikTok TV App đang hoạt động ngon lành cành đào trên Render!");
});

function isVietnameseContent(title) {
    if (!title) return false;
    const foreignRegex = /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\uac00-\ud7af]/;
    if (foreignRegex.test(title)) return false;

    const vnTones = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
    const commonVnWords = /threads|tiktok|remix|hot|review|vlog|drama|vs|tv|idols|p1|p2|part|dance|mashup|edm|flex/i;
    
    if (vnTones.test(title) || commonVnWords.test(title)) {
        return true;
    }
    return false;
}

async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu tiến trình cào dữ liệu kiểm soát hạn ngạch...");
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
        const picked = shuffledCatKeywords.slice(0, 3).map(kw => ({ text: kw, category: category }));
        selectedKeywords = [...selectedKeywords, ...picked];
    }
    
    selectedKeywords = shuffle(selectedKeywords);
    let newlyFetchedVideos = [];

    for (const item of selectedKeywords) {
        const keyword = item.text.trim();
        const category = item.category;
        const maxLimitForThisKeyword = categoryLimits[category] || 15; 

        let keywordVideosFetched = []; 
        
        // 🔥 SỬA ĐỔI 1: Nới rộng độ sâu nhảy trang (Cursor từ 0 đến 150) để lấy được video độc lạ, không bị trùng bài cũ
        const pageCursors = [
            Math.floor(Math.random() * 8) * 10, 
            Math.floor(Math.random() * 8 + 8) * 10
        ];

        for (const randomCursor of pageCursors) {
            if (keywordVideosFetched.length >= maxLimitForThisKeyword) break;

            try {
                await new Promise(resolve => setTimeout(resolve, 1200)); 
                
                // Thêm tham số ngẫu nhiên chặn cache API
                const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}&_r=${Math.random()}`;
                
                const response = await axios.get(targetUrl, { 
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
                });

                if (response.data && response.data.code !== 0) continue;

                if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
                    const fetched = response.data.data.videos.map(v => {
                        totalFetchedFromAPI++; 
                        const titleText = v.title || "";
                        if (!isVietnameseContent(titleText)) {
                            totalBlockedForeign++; 
                            return null; 
                        }
                        totalValidVN++; 
                        
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
            } catch (err) { console.log(`⚠️ Lỗi quét từ khóa [${keyword}]: ${err.message}`); }
        }
        newlyFetchedVideos = [...newlyFetchedVideos, ...keywordVideosFetched];
    }

    const totalMerged = [...oldVideos, ...newlyFetchedVideos];
    const uniqueMap = new Map();
    totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
    
    let finalResult = Array.from(uniqueMap.values());
    if (finalResult.length === 0) return { status: "Kho rỗng" };
    
    // Giới hạn kho lưu tối đa 2000 bài để chạy cho mượt
    finalResult = shuffle(finalResult).slice(-2000);
    fs.writeFileSync(FILE_PATH, JSON.stringify(finalResult, null, 2));

    return { status: "Thành công!", totalInDatabase: finalResult.length };
}

crawlAndSaveToJSON();

// 📺 API TRẢ VỀ CHO APP TV (ĐÃ ĐƯỢC FIX LỖI LẶP LẠI)
app.get(['/api/video', '/api/category'], (req, res) => {
    // 🔥 SỬA ĐỔI 2: Hạ số lượng mặc định từ 250 xuống 40 clip để tăng độ phân phối ngẫu nhiên
    const count = parseInt(req.query.count) || 40; 
    
    try {
        let liveVideos = [];
        if (fs.existsSync(FILE_PATH)) {
            liveVideos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        }

        const uniqueMap = new Map();
        liveVideos.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
        let finalPlayList = Array.from(uniqueMap.values());

        // 🔥 SỬA ĐỔI 3: Cơ chế loại trừ video đã xem dựa theo tham số ?exclude=id1,id2 từ App gửi lên
        const excludeParam = req.query.exclude;
        if (excludeParam) {
            const excludedIds = excludeParam.split(',');
            finalPlayList = finalPlayList.filter(v => !excludedIds.includes(v.videoId));
        }

        // Xáo trộn mạnh danh sách còn lại
        finalPlayList = shuffle(finalPlayList);
        
        // Trả về đúng số lượng yêu cầu
        return res.json(finalPlayList.slice(0, count));
    } catch (e) { return res.json([]); }
});

// API TÌM KIẾM ĐỘNG
app.get('/api/video/search', async (req, res) => {
    const keyword = req.query.keyword;
    const count = parseInt(req.query.count) || 40; 
    if (!keyword) return res.json([]);
    try {
        const randomCursor = Math.floor(Math.random() * 6) * 10; 
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

// Chạy cào tự động định kỳ mỗi 45 phút
setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) { console.log("⚠️ Lỗi cập nhật tự động:", err.message); }
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Đa Thể Loại chính thức kích nổ thành công tại cổng ${PORT}`));
