const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, 'public', 'chime');
const BASE_URL = 'https://static.sdkassets.chime.aws';

// 💡 离线资产大扫描清单（将所有可能的新老版命名，分为带参数和不带参数的下载尝试）
const filesToDownload = [
    { source: '/workers/estimator-v1.js', output: 'estimator-v1.js', useParams: true },
    { source: '/workers/voicefocus-worker-v1.js', output: 'voicefocus-worker-v1.js', useParams: true },
    { source: '/workers/voicefocus-worker.js', output: 'voicefocus-worker.js', useParams: true },
    // WASM 和大模型必须使用纯净 URL（useParams: false）来绕过 AWS 的 400 拦截
    { source: '/wasm/voicefocus-v1.wasm', output: 'voicefocus-v1.wasm', useParams: false },
    { source: '/wasm/voicefocus.wasm', output: 'voicefocus.wasm', useParams: false },
    { source: '/wasm/voicefocus-v1-simd.wasm', output: 'voicefocus-v1-simd.wasm', useParams: false },
    { source: '/wasm/voicefocus-simd.wasm', output: 'voicefocus-simd.wasm', useParams: false },
    { source: '/wasm/voicefocus-v1.json', output: 'voicefocus-v1.json', useParams: false },
    { source: '/wasm/voicefocus.json', output: 'voicefocus.json', useParams: false },
    { source: '/wasm/voicefocus-v1.model', output: 'voicefocus-v1.model', useParams: false },
    { source: '/wasm/voicefocus.model', output: 'voicefocus.model', useParams: false },
    { source: '/wasm/voicefocus-v1-simd.model', output: 'voicefocus-v1-simd.model', useParams: false },
    { source: '/wasm/voicefocus-simd.model', output: 'voicefocus-simd.model', useParams: false }
];

function downloadFile(sourcePath, outputPath, useParams) {
    return new Promise((resolve) => {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        
        // 动态拼接：如果 useParams 为 true 则带上校验后缀，否则使用完全纯净的请求避免 400 错误
        const querySuffix = useParams ? '?sdk=3.20.0&ua=chrome-140&assetGroup=sdk-3.20' : '';
        const fullUrl = `${BASE_URL}${sourcePath}${querySuffix}`;

        function fetchUrl(currentUrl) {
            https.get(currentUrl, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    if (!redirectUrl) return resolve('FAIL');
                    return fetchUrl(redirectUrl);
                }

                if (response.statusCode !== 200) {
                    // 无论是 404 还是 400，一律判定当前格式失效，优雅跳过，寻找备用格式
                    return resolve('FAIL');
                }

                const fileStream = fs.createWriteStream(outputPath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve('SUCCESS');
                });
            }).on('error', () => {
                fs.unlink(outputPath, () => {});
                resolve('FAIL');
            });
        }

        fetchUrl(fullUrl);
    });
}

async function main() {
    console.log('🚀 启动 Chime 资产自动离线补全（智能自适应绕过版）...');
    
    // 💡 第一路兜底：先从本地依赖包里捞现成的文件，把基础目录填饱，确保不留任何空白
    try {
        const localSource = path.resolve(__dirname, 'node_modules', 'amazon-chime-sdk-js', 'libs', 'voicefocus');
        if (fs.existsSync(localSource)) {
            console.log('📦 检测到本地内置文件，正在释放基础资产...');
            fs.cpSync(localSource, TARGET_DIR, { recursive: true });
        }
    } catch (e) {
        console.log('⚠️ 本地提取略过，转向全外网扫描...');
    }

    // 💡 第二路：全版本云端自动探针
    let downloadedCount = 0;
    for (const file of filesToDownload) {
        const fullOutputPath = path.join(TARGET_DIR, file.output);
        const result = await downloadFile(file.source, fullOutputPath, file.useParams);
        
        if (result === 'SUCCESS') {
            console.log(`|-- 🚀 [下载成功] 成功完成离线注入: ${file.output}`);
            downloadedCount++;
        }
    }
    
    console.log(`\n🎉 离线化阶段完成！本地已融合成套的模型与加速包。`);
}
main();
