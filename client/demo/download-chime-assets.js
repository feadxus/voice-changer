const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, 'public', 'chime');
const BASE_URL = 'https://static.sdkassets.chime.aws';
const PARAMS = '?sdk=3.20.0&ua=chrome-140&assetGroup=sdk-3.20';

const filesToDownload = [
    { source: '/workers/estimator-v1.js', output: 'estimator-v1.js' },
    { source: '/workers/voicefocus-worker-v1.js', output: 'voicefocus-worker-v1.js' },
    { source: '/wasm/voicefocus-v1.wasm', output: 'voicefocus-v1.wasm' },
    { source: '/wasm/voicefocus-v1-simd.wasm', output: 'voicefocus-v1-simd.wasm' },
    { source: '/wasm/voicefocus-v1.json', output: 'voicefocus-v1.json' },
    { source: '/wasm/voicefocus-v1.model', output: 'voicefocus-v1.model' },
    { source: '/wasm/voicefocus-v1-simd.model', output: 'voicefocus-v1-simd.model' }
];

// 💡 升级版下载函数：完美支持自动追随 301 / 302 重定向
function downloadFile(fileUrl, outputPath) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        
        function fetchUrl(currentUrl) {
            https.get(currentUrl, (response) => {
                // 1. 如果遇到 301 或 302 重定向，顺藤摸瓜追到新地址去
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    if (!redirectUrl) {
                        return reject(new Error(`Redirect status ${response.statusCode} but no Location header found.`));
                    }
                    console.log(`↩️ 发现重定向 (${response.statusCode})，正在前往新地址...`);
                    // 递归请求新地址
                    return fetchUrl(redirectUrl);
                }

                // 2. 目标不是 200 OK 则抛错
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download. Status code: ${response.statusCode}`));
                }

                // 3. 拿到 200 实物，安全存入本地硬盘
                const fileStream = fs.createWriteStream(outputPath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(outputPath, () => {});
                reject(err);
            });
        }

        // 首次启动下载（带上原装校验参数）
        fetchUrl(`${fileUrl}${PARAMS}`);
    });
}

async function main() {
    console.log('🚀 启动 Chime 资产自动补全（智能跟随重定向版）...');
    for (const file of filesToDownload) {
        try {
            await downloadFile(`${BASE_URL}${file.source}`, path.join(TARGET_DIR, file.output));
            console.log(`✅ 成功离线化: ${file.output}`);
        } catch (error) {
            console.error(`❌ 下载出错 [${file.output}]:`, error.message);
            process.exit(1); // 报错立刻中止，防止空气发布
        }
    }
    console.log('🎉 恭喜！全套离线资源与 AI 模型已全部安全抵达本地！');
}
main();
