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
// 🌍 CƠ CHẾ BẢO VỆ LỚP KÉP - 🔥 ĐÃ MỞ CỬA CHO DOUYIN/TRUNG QUỐC
// =======================================================================================
function isGlobalKeyword(kw) {
    if (!kw) return false;
    const lower = kw.toLowerCase().trim();
    return [
        "phonk", "funk", "biketok", "dance trend", 
        "hate that i made you love me", "trung quốc", "douyin" // 🔥 Cấp visa nhập cảnh
    ].some(g => lower.includes(g));
}

function isVietnameseContent(video, keyword = "") {
    const title = video.title || "";
    const region = (video.region || "").toUpperCase().trim();

    // 1. 🔥 ĐÃ RÚT MÃ TIẾNG TRUNG RA KHỎI LỆNH CẤM (Chỉ chặn Hàn, Nhật, Thái, Nga)
    const hasForeignScript = /[\uac00-\ud7af]|[\u3040-\u309f\u30a0-\u30ff]|[\u0e00-\u0e7f]|[\u0400-\u04ff]/.test(title);
    if (hasForeignScript) return false;

    // 2. 🔥 THẺ VIP ĐẶC CÁCH: Nếu Caption CÓ CHỮ HÁN -> AUTO CHO QUA!
    const hasChineseScript = /[\u4e00-\u9fa5]/.test(title);
    if (has
