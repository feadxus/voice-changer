const fs = require('fs');
const path = require('path');
const https = require('https');

// 定义资源输出路径及亚马逊官方源参数
const TARGET_DIR = path.join(__dirname, 'public', 'chime');
const BASE_URL = 'https://chime.aws';
const PARAMS = '?sdk=3.20.0&ua=chrome-140&assetGroup=sdk-3.20';

// 7 大核心文件下载清单（含模型 .model 和配置 .json）
const filesToDownload = [
    { source: '/workers/estimator-v1.js', output: 'workers/estimator-v1.js' },
    { source: '/workers/voicefocus-worker-v1.js', output: 'workers/voicefocus-worker-v1.js' },
    { source: '/wasm/voicefocus-v1.wasm', output: 'wasm/voicefocus-v1.wasm' },
    { source: '/wasm/voicefocus-v1-simd.wasm', output: 'wasm/voicefocus-v1-simd.wasm' },
    { source: '/wasm/voicefocus-v1.json', output: 'wasm/voicefocus-v1.json' },
    { source: '/wasm/voicefocus-v1.model', output: 'wasm/voicefocus-v1.model' },
    { source: '/wasm/voicefocus-v1-simd.model', output: 'wasm/voicefocus-v1-simd.model' }
];

// 原生下载函数
function downloadFile(fileUrl, outputPath) {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const fileStream = fs.createWriteStream(outputPath);
        https.get(`${fileUrl}${PARAMS}`, (response) => {
            if (response.statusCode !== 200) return reject(new Error(`Status ${response.statusCode}`));
            response.pipe(fileStream);
            fileStream.on('finish', () => { fileStream.close(); resolve(); });
        }).on('error', (err) => { fs.unlink(outputPath, () => {}); reject(err); });
    });
}

// 主逻辑
async function main() {
    console.log('🚀 启动 Chime 资产自动补全...');
    for (const file of filesToDownload) {
        await downloadFile(`${BASE_URL}${file.source}`, path.join(TARGET_DIR, file.output));
        console.log(`✅ 已下载: ${file.output}`);
    }
    console.log('🎉 离线文件下载完成！');
}
main();
