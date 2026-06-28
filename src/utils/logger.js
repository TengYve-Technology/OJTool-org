const chalk = require('chalk');

// 日志级别
const LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

let verbose = false;

/**
 * 设置是否显示debug级别日志
 * @param {boolean} v - 是否开启verbose模式
 */
function setVerbose(v) {
    verbose = v;
}

/**
 * 获取当前verbose状态
 * @returns {boolean}
 */
function getVerbose() {
    return verbose;
}

/**
 * 输出debug级别日志（仅在verbose模式下显示）
 * @param {string} msg - 日志消息
 */
function debug(msg) {
    if (verbose) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(chalk.gray(`[DEBUG] ${timestamp} - ${msg}`));
    }
}

/**
 * 输出info级别日志
 * @param {string} msg - 日志消息
 */
function info(msg) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.blue(`[INFO] ${timestamp} - ${msg}`));
}

/**
 * 输出warn级别日志
 * @param {string} msg - 日志消息
 */
function warn(msg) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.yellow(`[WARN] ${timestamp} - ${msg}`));
}

/**
 * 输出error级别日志
 * @param {string} msg - 日志消息
 */
function error(msg) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.red(`[ERROR] ${timestamp} - ${msg}`));
}

/**
 * 输出成功日志
 * @param {string} msg - 日志消息
 */
function success(msg) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.green(`[SUCCESS] ${timestamp} - ${msg}`));
}

/**
 * 输出失败日志
 * @param {string} msg - 日志消息
 */
function fail(msg) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.red(`[FAIL] ${timestamp} - ${msg}`));
}

/**
 * 输出普通日志（无颜色标记）
 * @param {string} msg - 日志消息
 */
function log(msg) {
    console.log(msg);
}

/**
 * 清除控制台
 */
function clear() {
    console.clear();
}

/**
 * 输出分隔线
 * @param {string} char - 分隔字符，默认为'-'
 * @param {number} length - 分隔线长度，默认为50
 */
function divider(char = '-', length = 50) {
    console.log(chalk.dim(char.repeat(length)));
}

/**
 * 输出标题
 * @param {string} title - 标题内容
 */
function title(title) {
    console.log();
    console.log(chalk.bold.cyan(`═ ${title} ═`));
    console.log();
}

module.exports = {
    setVerbose,
    getVerbose,
    debug,
    info,
    warn,
    error,
    success,
    fail,
    log,
    clear,
    divider,
    title,
    LEVELS
};