// Hàm tự động cào dữ liệu nâng cấp (Bản Vá Lỗi Kẹt Dữ Liệu Cũ)
async function crawlAndSaveToJSON() {
    console.log("🔄 [HỆ THỐNG] Bắt đầu cào dữ liệu tích lũy...");
    let currentData = {};
    try {
        if (fs.existsSync(FILE_PATH)) {
            currentData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        }
    } catch (e) {
        currentData = {};
    }

    for (const [key, keywords] of Object.entries(keywordsDatabase)) {
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
        try {
            console.log(`⏳ Đang cào cho mục [${key}] bằng từ khóa: "${randomKeyword}"`);
            const targetUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(randomKeyword)}&count=50&cursor=0`;
            
            const response = await axios.get(targetUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            });

            if (response.data && response.data.data && Array.isArray(response.data.data.videos) && response.data.data.videos.length > 0) {
                const fetchedVideos = response.data.data.videos.map(v => ({
                    video_id: v.video_id,
                    play: v.play,
                    title: v.title || "Video TikTok thú vị",
                    cover: v.cover,
                    play_count: v.play_count || 0,
                    author: { nickname: v.author?.unique_id ? "@" + v.author.unique_id : "@tiktok_user" },
                    music_info: { title: v.music_info?.title || "Âm thanh gốc" }
                }));

                const oldList = currentData[key] || [];
                // Nếu danh sách cũ chỉ có 1 video tượng trưng của fallback cũ, xóa nó đi để lấy hoàn toàn 100% video thật
                const cleanOldList = oldList.filter(v => !v.video_id.toString().includes('fallback') && !v.video_id.toString().includes('init'));
                
                const mergedList = [...cleanOldList, ...fetchedVideos];
                
                const uniqueMap = new Map();
                mergedList.forEach((video, index) => {
                    const idToSave = video.video_id || `${key}_auto_${index}_${Math.random().toString(36).substr(2, 5)}`;
                    video.video_id = idToSave;
                    uniqueMap.set(idToSave, video);
                });
                
                currentData[key] = Array.from(uniqueMap.values());
                console.log(`✅ Mục [${key}] cào thành công! Kho đang tích lũy thực tế: ${currentData[key].length} video.`);
            } else {
                // 🔥 ĐÃ SỬA: Nếu kho cũ có ít hơn hoặc bằng 1 video, ép buộc xả kho cứu nguy đầy đủ vào luôn chứ không giữ lại cái bị kẹt nữa
                if (!currentData[key] || currentData[key].length <= 1) {
                    console.log(`⚠️ Kho mục [${key}] bị thiếu hụt dữ liệu. Đang nạp kho cứu nguy đầy đủ...`);
                    currentData[key] = fallbackDatabase[key].map((v, i) => ({
                        ...v,
                        video_id: v.video_id || `${key}_fb_${i}_${Math.random().toString(36).substr(2, 3)}`
                    }));
                }
            }
        } catch (err) {
            console.error(`❌ Lỗi mục [${key}]: ${err.message}. Kiểm tra kho dữ liệu...`);
            // Nếu dính lỗi mạng/chặn mà kho đang trống hoặc chỉ có 1 video kẹt, bung ngay kho cứu nguy đầy đủ
            if (!currentData[key] || currentData[key].length <= 1) {
                currentData[key] = fallbackDatabase[key].map((v, i) => ({
                    ...v,
                    video_id: v.video_id || `${key}_fberr_${i}_${Math.random().toString(36).substr(2, 3)}`
                }));
            }
        }
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
    console.log("💾 [THÀNH CÔNG] Đã làm sạch và cập nhật file JSON!");
}
