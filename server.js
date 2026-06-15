// =======================================================================================
// 🌟 PHÂN CHIA LẠI 30 TỪ KHÓA - THẢ XÍCH CHO THỂ LOẠI AUDIO TRUYỆN 🌟
// =======================================================================================
const keywordsDatabase = {
    // Nhóm 1: Hài hước, Meme, Giải trí (🔥 ƯU TIÊN CAO)
    hai_huoc_meme: [
        "funny meme viet nam giải trí",
        "review phim ngan tom tat hai huoc",
        "slang gen z hai huoc",
        "flexing gen z viet nam",
        "Threads Việt Nam",
        "Trend Việt Nam"
    ],
    // Nhóm 2: Ẩm thực & Vlog đời sống
    am_thuc_vlog: [
        "review do an hot trend genz",
        "mukbang do an sieu ngon",
        "vlog cuoc song hang ngay chill",
        "goc khuat cuoc song tam trang",
        "podcast chữa lành tâm trạng gen z"
    ],
    // Nhóm 3: Audio truyện, Kịch truyền thanh (🔓 ĐÃ THẢ XÍCH - Nghe drama cuốn chao)
    audio_truyen: [
        "Audio Việt Nam",
        "Audio Tổng Tài",
        "Audio Thiên Kim"
    ],
    // Nhóm 4: Thời trang & Trai đẹp
    thoi_trang_trai_dep: [
        "ootd phoi do thoi trang genz",
        "Trai đẹp Việt Nam",
        "Trai đẹp Trung Quốc",
        "Trai đẹp Hàn Quốc"
    ],
    // Nhóm 5: Nhạc Remix, Gái nhảy, Biến hình (🚨 GIỚI HẠN VỪA PHẢI - Tránh bị ngấy)
    nhac_giat_giat: [
        "trend bien hinh tiktok viet nam",
        "remix giat giat cuon",
        "vinahouse remix tiktok hot",
        "mashup hot tiktok hien tai",
        "dance trend tiktok viet nam",
        "trend nhảy tiktok hot",
        "nhạc căng đét tiktok",
        "gái xinh nhảy edm hot",
        "vũ điệu cuốn hút tiktok",
        "hate that i made you love me VN"
    ],
    // Nhóm 6: Từ khóa chung chung (🚨 BÓP NGOÀI - Ít giá trị nội dung)
    generic_xuhuong: [
        "trend tiktok hien tai ",
        "TikTok Việt Nam",
        "xuhuong"
    ]
};

// =======================================================================================
// 🎯 BẢNG HẠN NGẠCH (QUOTA) ĐÃ ĐIỀU CHỈNH THEO Ý ÔNG GIÁO
// =======================================================================================
const categoryLimits = {
    hai_huoc_meme: 25,       // Vẫn ưu tiên tẹt ga
    am_thuc_vlog: 15,        // Xem cho thèm chơi
    audio_truyen: 12,        // 🔓 NÂNG LÊN 12 CLIP: Tha hồ nghe tổng tài bá đạo với thiên kim tiểu thư nhé!
    thoi_trang_trai_dep: 8,  // Đủ ngắm
    nhac_giat_giat: 4,       // Đủ đổi gió, không lo điếc tai
    generic_xuhuong: 2       // Giữ nguyên mức thấp để lọc rác
};
