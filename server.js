const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =======================================================================================
// 🌟 PHÂN CHIA CHÍNH XÁC 30 TỪ KHÓA CỦA ÔNG GIÁO VÀO CÁC NHÓM ĐỂ THIẾT LẬP HẠN NGẠCH 🌟
// =======================================================================================
const keywordsDatabase = {
    // Nhóm 1: Hài hước, Meme, Giải trí (🔥 ƯU TIÊN CAO NHẤT)
    hai_huoc_meme: [
        "review phim",
        "lốp",
        "Threads Việt Nam",
        "TikTok Việt Nam",
        "xuhuong",
        "biketok",
        "xh",
        "hate that i made you love me VN",
        "Capcut Giật Giật"
    ],
    // Nhóm 2: Ẩm thực & Vlog đời sống
    am_thuc_vlog: [
        "review do an hot trend",
        "mukbang do an sieu ngon",
        "vlog cuoc song hang ngay chill",
        "goc khuat cuoc song tam trang",
        "podcast chữa lành tâm trạng "
    ],
    // Nhóm 3: Audio truyện, Kịch truyền thanh (🔓 ĐÃ THẢ XÍCH THEO YÊU CẦU - 12 clip)
    audio_truyen: [
        "Audio Việt Nam",
        "Audio Tổng Tài",
        "Audio Thiên Kim"
    ],
    // Nhóm 4: Thời trang & Trai đẹp (Vừa đủ ngắm)
    thoi_trang_trai_dep: [
        "Trai đẹp Việt Nam",
        "Trai đẹp Trung Quốc",
        "Trai đẹp Hàn Quốc"
    ],
    // Nhóm 5: Nhạc Remix, Gái nhảy, Biến hình (🚨 BÓP MẠNH)
    nhac_giat_giat: [
        "trend bien hinh tiktok viet nam",
        "remix giat giat cuon",
        "vinahouse remix tiktok hot",
        "mashup hot tiktok hien tai",
        "dance trend tiktok viet nam",
        "trend nhảy tiktok hot",
        "nhạc căng đét tiktok",
        "gái xinh nhảy edm hot",
        "vũ điệu cuốn hút tiktok"
    ],
    // Nhóm 6: Từ khóa chung chung (🚨 BÓP NGOÀI)
    generic_xuhuong: [
        "Trend TikTok hiện tại"
    ]
};

// =======================================================================================
// 🎯 BẢNG HẠN NGẠCH (QUOTA) ĐÃ ĐIỀU CHỈNH - HÀI NHIỀU, AUDIO ĐỦ NGHE, GIẬT GIẬT BỚT LẠI
// =======================================================================================
const categoryLimits = {
    hai_huoc_meme: 25,       
    am_thuc_vlog: 10,        
    audio_truyen: 15,        // Nghe tổng tài mệt nghỉ
    thoi_trang_trai_dep: 8,  
    nhac_giat_giat: 4,       
    generic_xuhuong: 25       
};

const app = express(); 
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join(__dirname, 'videos.json');

// THUẬT TOÁN ĐẢO MẢNG
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

// HÀM KIỂM TRA CHẶN VIDEO NƯỚC NGOÀI
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

// Hàm cào dữ liệu kiểm soát số lượng theo thể loại
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu tiến trình cào dữ liệu kiểm soát hạn ngạch...");
    let oldVideos = [];
    
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

    let selectedKeywords = [];
    for (const category in keywordsDatabase) {
        const shuffledCatKeywords = shuffle([...keywordsDatabase[category]]);
        const picked = shuffledCatKeywords.slice(0, 3).map(kw => ({
            text: kw,
            category: category
        }));
        selectedKeywords = [...selectedKeywords, ...picked];
    }
    
    selectedKeywords = shuffle(selectedKeywords);
    console.log(`📡 [HỆ THỐNG] Đã lập lịch quét cân bằng với ${selectedKeywords.length} từ khóa...`);

    let newlyFetchedVideos = [];

    for (const item of selectedKeywords) {
        const keyword = item.text.trim();
        const category = item.category;
        const maxLimitForThisKeyword = categoryLimits[category] || 10; 

        let keywordVideosFetched = []; 
        const pageCursors = [Math.floor(Math.random() * 4) * 10, Math.floor(Math.random() * 4 + 4) * 10];

        for (const randomCursor of pageCursors) {
            if (keywordVideosFetched.length >= maxLimitForThisKeyword) break;

            try {
                await new Promise(resolve => setTimeout(resolve, 1500)); 
                console.log(`⏳ Quét nhóm [${category.toUpperCase()}] - Từ khóa: "${keyword}" (Max cho phép: ${maxLimitForThisKeyword})`);
                
                // 🛠️ ĐÃ FIX ĐƯỜNG LINK: Đổi từ api.tikwm.com sang www.tikwm.com
                const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword)}&count=30&cursor=${randomCursor}`;
                
                const response = await axios.get(targetUrl, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                    }
                });

                if (response.data && response.data.code !== 0) {
                    continue;
                }

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
                            originUrl: v.play
                        };
                    }).filter(v => v !== null);

                    for (const video of fetched) {
                        if (keywordVideosFetched.length < maxLimitForThisKeyword) {
                            keywordVideosFetched.push(video);
                        } else {
                            break; 
                        }
                    }
                }
            } catch (err) {
                console.log(`⚠️ Lỗi quét từ khóa [${keyword}]: ${err.message}`);
            }
        }

        console.log(`    -> Chốt sổ từ khóa: Gom được ${keywordVideosFetched.length} / ${maxLimitForThisKeyword} clip tối đa.`);
        newlyFetchedVideos = [...newlyFetchedVideos, ...keywordVideosFetched];
    }

    const totalMerged = [...oldVideos, ...newlyFetchedVideos];

    // Lọc trùng bằng videoId
    const uniqueMap = new Map();
    totalMerged.forEach(v => { if (v.videoId) uniqueMap.set(v.videoId, v); });
    
    let finalResult = Array.from(uniqueMap.values());

    if (finalResult.length === 0) {
        return {
            status: "Thất bại - Kho rỗng",
            totalFetched: totalFetchedFromAPI,
            totalValid: totalValidVN,
            totalBlocked: totalBlockedForeign,
            totalInDatabase: oldVideos.length
        };
    }
    
    finalResult = shuffle(finalResult).slice(-3000);
    fs.writeFileSync(FILE_PATH, JSON.stringify(finalResult, null, 2));

    console.log(`\n📊 ========================================================`);
    console.log(`📊 [THỐNG KÊ HOÀN THÀNH TIẾN TRÌNH CÀO VIDEO TREND]`);
    console.log(`   - 🔎 Tổng số video quét từ API TikWM : ${totalFetchedFromAPI} clip`);
    console.log(`   - ✅ Số clip tiếng Việt XỊN giữ lại  : ${totalValidVN} clip`);
    console.log(`   - ❌ Số clip nước ngoài bị CHẶN ĐỨNG : ${totalBlockedForeign} clip`);
    console.log(`   - 💾 Tổng số lượng kho lưu trữ JSON  : ${finalResult.length} clip (Đã ép quota cân bằng)`);
    console.log(`========================================================\n`);

    return {
        status: "Thành công rực rỡ!",
        totalFetched: totalFetchedFromAPI,
        totalValid: totalValidVN,
        totalBlocked: totalBlockedForeign,
        totalInDatabase: finalResult.length
    };
}

// Tự kích hoạt cào khi khởi động
crawlAndSaveToJSON();

// API TRẢ VỀ CHO APP TV
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

// API TÌM KIẾM ĐỘNG
app.get('/api/video/search', async (req, res) => {
    const keyword = req.query.keyword;
    const count = parseInt(req.query.count) || 50; 
    if (!keyword) return res.json([]);
    try {
        const randomCursor = Math.floor(Math.random() * 3) * 10; 
        // 🛠️ ĐÃ FIX ĐƯỜNG LINK Ở ĐÂY LUÔN
        const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(keyword.trim())}&count=${count}&cursor=${randomCursor}`;
        const response = await axios.get(targetUrl, { timeout: 12000 });
        if (response.data && response.data.data && Array.isArray(response.data.data.videos)) {
            let fetched = response.data.data.videos.map(v => {
                if (!isVietnameseContent(v.title || "")) return null; 
                return { videoId: v.video_id, videoUrl: v.play, title: v.title, cover: v.cover, views: v.play_count || 0, author: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user", originUrl: v.play };
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
        // 🛠️ ĐÃ FIX ĐƯỜNG LINK LẤY CMT
        const response = await axios.get(`https://www.tikwm.com/api/comment/list?video_id=${videoId}&count=30`);
        return res.json(response.data);
    } catch (err) { return res.json({ code: -1, msg: err.message }); }
});

app.get('/api/crawl-more', async (req, res) => {
    const reportStats = await crawlAndSaveToJSON();
    res.json({ message: "Hệ thống bot vừa thực hiện quét kho video mới xong!", thong_ke_chi_tiet: reportStats });
});

setInterval(async () => {
    try { await crawlAndSaveToJSON(); } catch (err) { console.log("⚠️ Lỗi cập nhật tự động:", err.message); }
}, 45 * 60 * 1000);

app.listen(PORT, () => console.log(`🚀 Server Đa Thể Loại chính thức kích nổ thành công tại cổng ${PORT}`));
