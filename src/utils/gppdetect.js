const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 检测 g++ 是否可用
function detectGpp() {
    return new Promise((resolve) => {
        exec('g++ --version', (error, stdout) => {
            if (error) {
                resolve({ found: false, version: null, path: null });
                return;
            }
            // 提取版本号（第一行）
            const firstLine = stdout.split('\n')[0] || '';
            const versionMatch = firstLine.match(/(\d+\.\d+\.\d+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';
            resolve({
                found: true,
                version: version,
                path: 'g++' // 在 PATH 中
            });
        });
    });
}

// 检测指定路径的 g++
function detectGppAtPath(gppPath) {
    return new Promise((resolve) => {
        exec(`"${gppPath}" --version`, (error, stdout) => {
            if (error) {
                resolve({ found: false, version: null, path: gppPath });
                return;
            }
            const firstLine = stdout.split('\n')[0] || '';
            const versionMatch = firstLine.match(/(\d+\.\d+\.\d+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';
            resolve({
                found: true,
                version: version,
                path: gppPath
            });
        });
    });
}

// 检测 MinGW 是否安装（Windows）
function detectMinGW() {
    return new Promise((resolve) => {
        const possiblePaths = [
            'C:\\MinGW\\bin\\g++.exe',
            'C:\\mingw64\\bin\\g++.exe',
            'C:\\Program Files\\mingw-w64\\*\\bin\\g++.exe'
        ];
        // 简化版：只检测 PATH 中的 g++
        detectGpp().then(result => {
            if (result.found) {
                resolve({ found: true, path: 'g++', version: result.version });
            } else {
                resolve({ found: false, path: null, version: null });
            }
        });
    });
}

module.exports = {
    detectGpp,
    detectGppAtPath,
    detectMinGW
};