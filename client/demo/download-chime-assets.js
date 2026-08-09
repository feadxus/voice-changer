const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, 'public', 'chime');
const BASE_URL = 'https://static.sdkassets.chime.aws';
const PARAMS = '?sdk=3.20.0&ua=chrome-140&assetGroup=sdk-3.20';

// 💡 核心对齐：去掉多余的 "-v1" 字样，完美匹配亚马逊 3.20.0 官方 CDN 的老版本资源路径
const filesToDownload = [
    { source: '/workers/estimator-v1.js', output: 'estimator-v1.js' }, // 这个本身就带-v1
    { source: '/workers/voicefocus-worker.js', output: 'voicefocus-worker.js' },
    { source: '/wasm/voicefocus.wasm', output: 'voicefocus.wasm' },
    { source: '/wasm/voicefocus-simd.wasm', output: 'voicefocus-simd.wasm' },
    { source: '/wasm/voicefocus.json', output: 'voicefocus.json' },
    { source: '/wasm/voicefocus.model', output: 'voicefocus.model' },
    { source: '/wasm/voicefocus-simd.model', output: 'voicefocus-simd.model' }
];

function downloadFile(fileUrl, outputPath) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        
        function fetchUrl(currentUrl) {
            https.get(currentUrl, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    if (!redirectUrl) {
                        return reject(new Error(`Redirect status ${response.statusCode} but no Location header found.`));
                    }
                    return fetchUrl(redirectUrl);
                }

                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download. Status code: ${response.statusCode}`));
                }

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

        fetchUrl(`${fileUrl}${PARAMS}`);
    });
}

async function main() {
    console.log('🚀 启动 Chime 资产自动补全（3.20.0 规范对齐版）...');
    for (const file of filesToDownload) {
        try {
            await downloadFile(`${BASE_URL}${file.source}`, path.join(TARGET_DIR, file.output));
            console.log(`✅ 成功离线化: ${file.output}`);
        } catch (error) {
            console.error(`❌ 下载出错 [${file.output}]:`, error.message);
            process.exit(1); 
        }
    }
    console.log('🎉 恭喜！全套老版本离线资源与 AI 模型已全部安全抵达本地！');
}
main();
