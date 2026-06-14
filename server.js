const axios = require('axios');
const fs = require('fs'); // Thư viện có sẵn của Node.js để ghi file

// Hàm đi săn video từ TikWM theo Từ khóa tiếng Việt
async function crawlVietnameseContent(categoryName, searchKeyword) {
    try {
        console.log(`\n🇻🇳 Bot đang quét mục [${categoryName}] với từ khóa: "${searchKeyword}"...`);
        
        // Gọi API TikWM để tìm kiếm video đang hot
        const response = await axios.post('https://www.tikwm.com/api/feed/search', {
            keywords: searchKeyword,
            count: 10, // Lấy thử 10 cái test trước cho nhanh
            cursor: 0
        });

        if (response.data && response.data.data && response.data.data.videos) {
            const videoList = response.data.data.videos;
            const parsedVideos = [];
            
            for (let video of videoList) {
                // Cấu trúc dữ liệu tối giản để hiện lên App TV
                parsedVideos.push({
                    videoId: video.video_id,
                    author: "@" + video.author.unique_id,
                    title: video.title,
                    cover: video.cover, // Link ảnh Thumbnail hiện ở danh sách ô vuông
                    views: video.play_count, // Lượt xem
                    originUrl: `https://www.tiktok.com/@${video.author.unique_id}/video/${video.video_id}`
                });
            }

            // Ghi dữ liệu cào được thành file JSON ngay trong thư mục
            const fileName = `${categoryName}.json`;
            fs.writeFileSync(fileName, JSON.stringify(parsedVideos, null, 2), 'utf-8');
            console.log(`✅ Đã lưu xong dữ liệu mục [${categoryName}] vào file: ${fileName}`);
            console.log(`👉 Thử xem mẫu 1 item cào được:`, parsedVideos[0]);
        } else {
            console.log(`⚠️ Không tìm thấy video nào cho mục [${categoryName}].`);
        }
    } catch (error) {
        console.error(`❌ Lỗi khi cào mục [${categoryName}]:`, error.message);
    }
}

// 🔥 TRÌNH KÍCH HOẠT CHẠY TỔNG HỢP CÁC TAB VIỆT NAM
async function startCrawlVN() {
    console.log("🚀 BẮT ĐẦU CÀO DỮ LIỆU VIDEO VIỆT NAM...");
    
    // Test trước mục Hài Hước
    await crawlVietnameseContent("hai_huoc", "hài hước tik tok việt nam meme");
    
    // Test tiếp mục Buồn / Tâm trạng
    await crawlVietnameseContent("tam_trang", "nhạc buồn tâm trạng chill lofi");

    console.log("\n🎉 HOÀN THÀNH TẤT CẢ! Ông kiểm tra thư mục xem đã có file .json chưa nhé.");
    process.exit(); 
}

// Chạy lệnh gom hàng
startCrawlVN();