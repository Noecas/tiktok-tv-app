// Hàm tự động cào tích lũy dữ liệu sạch vào file JSON (Bản nâng cấp chống nghẽn)
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu cào dữ liệu tích lũy...");
    
    let currentData = {};
    try {
        currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    } catch (e) {
        currentData = { hai_huoc: [], tam_trang: [], game: [], phim_anh: [], kienthuc: [], van_minh: [], threads_topic: [] };
    }

    for (const [key, keywords] of Object.entries(keywordsDatabase)) {
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        
        try {
            console.log(`⏳ Đang cào cho mục [${key}] bằng từ khóa: "${randomKeyword}"`);
            
            // 🔥 ĐÃ SỬA: Chuyển sang gọi GET kèm mã hóa từ khóa, chuẩn 100% tài liệu TikWM
            const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(randomKeyword)}&count=50&cursor=0`;
            const response = await axios.get(targetUrl, { timeout: 10000 });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos) && response.data.data.videos.length > 0) {
                const fetchedVideos = response.data.data.videos.map(v => ({
                    video_id: v.video_id,
                    play: v.play,
                    title: v.title || "Video TikTok thú vị",
                    cover: v.cover,
                    play_count: v.play_count || 0,
                    author: {
                        nickname: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user"
                    },
                    music_info: {
                        title: v.music_info?.title || "Âm thanh gốc"
                    }
                }));

                const oldList = currentData[key] || [];
                const mergedList = [...oldList, ...fetchedVideos];

                // Lọc trùng bằng Video ID
                const uniqueMap = new Map();
                mergedList.forEach(video => {
                    if (video.video_id) uniqueMap.set(video.video_id, video);
                });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] đang tích lũy tổng cộng: ${currentData[key].length} video.`);
            } else {
                console.log(`⚠️ TikWM không trả video cho mục [${key}]. Kích hoạt kho dự phòng...`);
                // 🧠 BƠM VIDEO DỰ PHÒNG: Nếu API lỗi, tự động nhét vài video mẫu vào để cứu nguy cho App
                if (!currentData[key] || currentData[key].length === 0) {
                    currentData[key] = [
                        {
                            video_id: "7123456789012345678",
                            play: "https://v16-webapp-prime.tiktok.com/video/tos/useast2a/tos-useast2a-ve-0068c001-e7/oAAnZfIAnCAgEw7DlBAfD7eIEgKQA7bVAfQfQA/", // Link video mẫu
                            title: "Video dự phòng hệ thống - Đang cập nhật dữ liệu mới",
                            cover: "https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/os7DeI7fAnD...",
                            play_count: 9999,
                            author: { nickname: "@system_backup" },
                            music_info: { title: "Âm thanh hệ thống" }
                        }
                    ];
                }
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]:`, err.message);
        }
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã cập nhật file dữ liệu!");
}
