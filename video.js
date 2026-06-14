// KHO VIDEO CỨU NGUY HỆ THỐNG
const fallbackDatabase = {
    "hai_huoc": [
        {
            "video_id": "7311111111111111111",
            "play": "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c001-e7/oAAnZfIAnCAgEw7DlBAfD7eIEgKQA7bVAfQfQA/",
            "title": "Tổng hợp clip hài hước vô tri xả stress cực mạnh cười bể bụng",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 154000,
            "author": { "nickname": "@haihuoc_tv" },
            "music_info": { "title": "Nhạc nền tấu hài vui nhộn" }
        },
        {
            "video_id": "7311111111111111112",
            "play": "https://www.w3schools.com/html/mov_bbb.mp4",
            "title": "Khi bạn cố gắng làm video hài tik tok việt nam và cái kết bất ngờ",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 98000,
            "author": { "nickname": "@meme_vietnam" },
            "music_info": { "title": "Âm thanh gốc hài hước" }
        }
    ],
    "tam_trang": [
        {
            "video_id": "7322222222222222221",
            "play": "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c001-e7/oAAnZfIAnCAgEw7DlBAfD7eIEgKQA7bVAfQfQA/",
            "title": "Nhạc lofi chill tâm trạng buồn - Bản nhạc dành cho những đêm muộn cô đơn",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 245000,
            "author": { "nickname": "@lofi_chill_dem" },
            "music_info": { "title": "Lofi Tâm Trạng Đêm" }
        }
    ],
    "game": [
        {
            "video_id": "7333333333333333331",
            "play": "https://www.w3schools.com/html/movie.mp4",
            "title": "Highlight Liên Quân Mobile - Pha lật kèo kinh điển của Thần đồng",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 312000,
            "author": { "nickname": "@liquan_highlight" },
            "music_info": { "title": "Nhạc chiến game cực căng" }
        }
    ],
    "phim_anh": [
        {
            "video_id": "7344444444444444441",
            "play": "https://www.w3schools.com/html/mov_bbb.mp4",
            "title": "Review phim hay nghẹt thở: Sát thủ ẩn danh tái xuất giang hồ cực đỉnh",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 870000,
            "author": { "nickname": "@review_phim_hay" },
            "music_info": { "title": "Review Phim Kịch Tính" }
        }
    ],
    "kienthuc": [
        {
            "video_id": "7355555555555555551",
            "play": "https://www.w3schools.com/html/movie.mp4",
            "title": "Kiến thức thú vị: Sự thật lạ lùng về vũ trụ rộng lớn mà bạn chưa từng biết",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 450000,
            "author": { "nickname": "@khoahoc_thuvi" },
            "music_info": { "title": "Khám Phá Thế Giới" }
        }
    ],
    "van_minh": [
        {
            "video_id": "7366666666666666661",
            "play": "https://www.w3schools.com/html/mov_bbb.mp4",
            "title": "Bài học cuộc sống ý nghĩa: Cách ứng xử văn minh lịch sự nơi công cộng",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 120000,
            "author": { "nickname": "@song_van_minh" },
            "music_info": { "title": "Truyền cảm hứng chữa lành" }
        }
    ],
    "threads_topic": [
        {
            "video_id": "7377777777777777771",
            "play": "https://www.w3schools.com/html/movie.mp4",
            "title": "Tóm tắt drama hot nhất trên Threads Việt Nam hôm nay - Góc tâm sự thầm kín",
            "cover": "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD",
            "play_count": 68000,
            "author": { "nickname": "@threads_confession" },
            "music_info": { "title": "Đọc tin tức Threads chill" }
        }
    ]
};

// KHO TỪ KHÓA ĐỂ CÀO TIKTOK
const keywordsDatabase = {
    "hai_huoc": ["hài hước tik tok việt nam", "tấu hài cực mạnh tiktok", "clip vui cười rớt hàm"],
    "tam_trang": ["nhạc buồn tâm trạng chill", "lofi tâm trạng buồn", "nhạc lofi chill đêm muộn"],
    "game": ["highlight liên quân mobile", "pubg mobile việt nam hài", "liên minh huyền thoại tấu hài"],
    "phim_anh": ["review phim hay kịch tính", "tóm tắt phim truyền hình"],
    "kienthuc": ["kiến thức thú vị đời sống", "sự thật lạ lùng bạn chưa biết"],
    "van_minh": ["lối sống văn minh tích cực", "bài học cuộc sống ý nghĩa", "chữa lành tâm hồn nhẹ nhàng"],
    "threads_topic": ["story threads việt nam", "tóm tắt drama threads", "tâm sự threads hài hước"]
};

// Xuất khẩu (Export) dữ liệu ra ngoài để file khác gọi được
module.exports = { fallbackDatabase, keywordsDatabase };
