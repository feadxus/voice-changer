const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, 'public', 'chime');
const BASE_URL = 'https://static.sdkassets.chime.aws';
const PARAMS = '?sdk=3.20.0&ua=chrome-140&assetGroup=sdk-3.20';

// 💡 闭环关键：把可能的所有新老版本命名全部网罗进来，总有一个对的！
const filesToDownload = [
    { source: '/workers/estimator-v1.js', output: 'estimator-v1.js' },
    { source: '/workers/voicefocus-worker-v1.js', output: 'voicefocus-worker-v1.js' },
    { source: '/workers/voicefocus-worker.js', output: 'voicefocus-worker.js' },
    { source: '/wasm/voicefocus-v1.wasm', output: 'voicefocus-v1.wasm' },
    { source: '/wasm/voicefocus.wasm', output: 'voicefocus.wasm' },
    { source: '/wasm/voicefocus-v1-simd.wasm', output: 'voicefocus-v1-simd.wasm' },
    { source: '/wasm/voicefocus-simd.wasm', output: 'voicefocus-simd.wasm' },
    { source: '/wasm/voicefocus-v1.json', output: 'voicefocus-v1.json' },
    { source: '/wasm/voicefocus.json', output: 'voicefocus.json' },
    { source: '/wasm/voicefocus-v1.model', output: 'voicefocus-v1.model' },
    { source: '/wasm/voicefocus.model', output: 'voicefocus.model' },
    { source: '/wasm/voicefocus-v1-simd.model', output: 'voicefocus-v1-simd.model' },
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

                // 💡 如果是 404，不抛出致命错误，直接返回特殊的 '404' 状态字通知上层跳过
                if (response.statusCode === 404) {
                    return resolve('404');
                }

                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download. Status code: ${response.statusCode}`));
                }

                const fileStream = fs.createWriteStream(outputPath);
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve('200');
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
    console.log('🚀 启动 Chime 资产自动补全（全版本扫描兼容版）...');
    let successCount = 0;

    for (const file of filesToDownload) {
        try {
            const result = await downloadFile(`${BASE_URL}${file.source}`, path.join(TARGET_DIR, file.output));
            if (result === '404') {
                console.log(`⚠️ 资源在云端不存在(跳过): ${file.source}`);
            } else {
                console.log(`✅ 成功离线化: ${file.output}`);
                successCount++;
            }
        } catch (error) {
            console.error(`❌ 网络致命错误 [${file.output}]:`, error.message);
            process.exit(1); 
        }
    }
    
    if(successCount > 0) {
        console.log(`🎉 恭喜！已在本地集齐所有可用版本的离线资源与 AI 模型（共 ${successCount} 个）！`);
    } else {
        console.error('❌ 致命错误：没有任何一个文件下载成功！');
        process.exit(1);
    }
}
main();
