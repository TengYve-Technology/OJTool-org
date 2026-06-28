const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { getConfigPath, readConfig } = require('../core/configmanager');
const { detectGpp, detectGppAtPath } = require('../utils/gppDetect');
const { getJudgerPath } = require('../core/judgeengine');

module.exports = async function doctor() {
    console.log(chalk.blue.bold('🔍 环境检测中...'));
    console.log('');

    // 1. 检测 g++
    console.log(chalk.cyan('📌 [1/4] 检测 g++ 编译器'));
    const gppResult = await detectGpp();
    if (gppResult.found) {
        console.log(chalk.green(`  ✅ g++ 已安装 (版本: ${gppResult.version})`));
    } else {
        console.log(chalk.red('  ❌ g++ 未找到'));
        console.log(chalk.gray('     请安装 MinGW 或手动指定 g++ 路径'));
        console.log(chalk.gray('     配置方法: ojtool config --edit'));
    }
    console.log('');

    // 2. 检测配置文件
    console.log(chalk.cyan('📌 [2/4] 检测配置文件'));
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        console.log(chalk.green(`  ✅ 配置文件存在: ${configPath}`));
        const config = readConfig();
        if (config) {
            console.log(chalk.gray(`     题目前缀: ${config.problemPrefix}`));
            console.log(chalk.gray(`     测试用例: ${config.testCaseCount}`));
            console.log(chalk.gray(`     超时时间: ${config.timeLimitMs}ms`));
        }
    } else {
        console.log(chalk.yellow('  ⚠️  配置文件不存在'));
        console.log(chalk.gray('     请运行: ojtool init'));
    }
    console.log('');

    // 3. 检测目录权限
    console.log(chalk.cyan('📌 [3/4] 检测目录权限'));
    try {
        const testFile = './.ojtool_test.tmp';
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(chalk.green('  ✅ 当前目录可读写'));
    } catch (error) {
        console.log(chalk.red('  ❌ 当前目录不可读写'));
    }
    console.log('');

    // 4. 检测评测机
    console.log(chalk.cyan('📌 [4/4] 检测评测机'));
    const judgerPath = getJudgerPath();
    if (fs.existsSync(judgerPath)) {
        const stats = fs.statSync(judgerPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(chalk.green(`  ✅ 评测机已编译 (大小: ${sizeMB}MB)`));
        console.log(chalk.gray(`     路径: ${judgerPath}`));
    } else {
        console.log(chalk.red('  ❌ 评测机未编译'));
        console.log(chalk.gray('     请运行以下命令编译评测机：'));
        console.log(chalk.gray('     g++ -o bin/judger.exe judger.cpp -std=c++17 -O2 -static'));
    }
    console.log('');

    console.log(chalk.green.bold('✅ 环境检测完成'));
};