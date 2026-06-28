const fs = require('fs');
const path = require('path');

const os = require('os');

// 获取桌面路径
function getDesktopPath() {
    return path.join(os.homedir(), 'Desktop');
}

// 默认配置
const DEFAULT_CONFIG = {
    version: '1.0.0',
    gppPath: 'g++',
    problemPrefix: 'problem',
    testCaseCount: 10,
    timeLimitMs: 1000,
    scorePerCase: 10,
    cppVersion: 17,
    compileFlags: '-O2 -Wall',
    outputLimitKb: 1024,
    playerCount: 1,
    basePath: getDesktopPath(),
    directories: {
        input: './data/in',
        output: './data/out',
        answer: './data/ans',
        temp: './temp'
    }
};

// 获取配置文件路径（当前目录）
function getConfigPath() {
    return path.join(process.cwd(), 'ojtool.json');
}

// 读取配置（如果文件不存在，返回 null）
function readConfig() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
        return null;
    }
    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ 配置文件格式错误:', error.message);
        return null;
    }
}

// 写入配置
function writeConfig(config) {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
}

// 验证配置是否完整
function validateConfig(config) {
    const required = ['gppPath', 'problemPrefix', 'testCaseCount', 'timeLimitMs', 'scorePerCase', 'cppVersion'];
    for (const key of required) {
        if (config[key] === undefined || config[key] === null) {
            return { valid: false, missing: key };
        }
    }
    return { valid: true };
}

// 获取配置（如果不存在则返回默认配置）
function getConfig() {
    const config = readConfig();
    if (config) {
        const validation = validateConfig(config);
        if (!validation.valid) {
            console.warn(`⚠️  配置缺少字段: ${validation.missing}，使用默认值`);
            return { ...DEFAULT_CONFIG, ...config };
        }
        return { ...DEFAULT_CONFIG, ...config };
    }
    return { ...DEFAULT_CONFIG };
}

// 重置为默认配置
function resetConfig() {
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
}

module.exports = {
    DEFAULT_CONFIG,
    getConfigPath,
    readConfig,
    writeConfig,
    validateConfig,
    getConfig,
    resetConfig
};