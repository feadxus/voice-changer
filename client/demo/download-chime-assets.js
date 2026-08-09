const fs = require('fs');
const path = require('path');
const https = require('https');

// 💡 修正关键：让它直接吐进 demo 项目原装的 public/chime 目录中
const TARGET_DIR = path.join(__dirname, 'public', 'chime');
const BASE_URL = 'https://chime.aws';
const PARAMS = '?sdk=3.20.0&ua=chrome-140&assetGroup=sdk-3.20';

// 7 大核心离线资产清单（扁平化存放在原作者指定的 public/chime 目录中）
const filesToDownload = [
    { source: '/workers/estimator-v1.js', output: 'estimator-v1.js' },
    { source: '/workers/voicefocus-worker-v1.js', output: 'voicefocus-worker-v1.js' },
    { source: '/wasm/voicefocus-v1.wasm', output: 'voicefocus-v1.wasm' },
    { source: '/wasm/voicefocus-v1-simd.wasm', output: 'voicefocus-v1-simd.wasm' },
    { source: '/wasm/voicefocus-v1.json', output: 'voicefocus-v1.json' },
    { source: '/wasm/voicefocus-v1.model', output: 'voicefocus-v1.model' },
    { source: '/wasm/voicefocus-v1-simd.model', output: 'voicefocus-v1-simd.model' }
];

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

async function main() {
    console.log('🚀 启动 Chime 资产自动补全（Demo层闭环）...');
    for (const file of filesToDownload) {
        await downloadFile(`${BASE_URL}${file.source}`, path.join(TARGET_DIR, file.output));
        console.log(`✅ 成功离线化: ${file.output}`);
    }
    console.log('🎉 离线大模型及脚本已 100% 集齐！');
}
main();
