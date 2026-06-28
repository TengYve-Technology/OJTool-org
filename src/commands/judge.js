const chalk = require('chalk');
const configManager = require('../core/configmanager');
const judgeEngine = require('../core/judgeengine');
const logger = require('../utils/logger');

/**
 * 执行评测命令
 * @param {Object} options - 命令行选项
 */
async function judge(options) {
    console.log(chalk.blue.bold('🧪 开始评测...'));
    console.log();

    // 加载配置
    const config = configManager.getConfig();
    if (!config) {
        console.log(chalk.red('❌ 配置文件不存在，请先运行 ojtool init 初始化'));
        return;
    }

    // 验证配置
    const validation = configManager.validateConfig(config);
    if (!validation.valid) {
        console.log(chalk.yellow(`⚠️  配置缺少字段: ${validation.missing}，使用默认值`));
    }

    // 设置详细输出模式
    if (options.verbose) {
        logger.setVerbose(true);
    }

    // 构建评测选项
    const judgeOptions = {
        playerCount: options.players ? parseInt(options.players) : config.playerCount,
        basePath: options.path || config.basePath,
        verbose: options.verbose || false
    };

    // 验证必需参数
    if (!judgeOptions.playerCount || judgeOptions.playerCount < 1) {
        console.log(chalk.red('❌ 选手数量必须大于 0'));
        console.log(chalk.yellow('提示: 使用 --players 参数或在配置文件中设置 playerCount'));
        return;
    }

    if (!judgeOptions.basePath) {
        console.log(chalk.red('❌ 缺少基础路径配置'));
        console.log(chalk.yellow('提示: 使用 --path 参数或在配置文件中设置 basePath'));
        return;
    }

    // 显示评测配置
    console.log(chalk.cyan('📋 评测配置:'));
    console.log(`   题目前缀: ${config.problemPrefix}`);
    console.log(`   测试用例数: ${config.testCaseCount}`);
    console.log(`   选手数量: ${judgeOptions.playerCount}`);
    console.log(`   基础路径: ${judgeOptions.basePath}`);
    console.log(`   时间限制: ${config.timeLimitMs}ms`);
    console.log(`   每用例分值: ${config.scorePerCase}分`);
    console.log();

    try {
        // 执行评测
        const result = await judgeEngine.runJudge(config, judgeOptions);

        // 显示结果摘要
        console.log();
        judgeEngine.printResultSummary(result.results);

        // 如果指定了详细输出，显示每个选手的详细结果
        if (options.detail) {
            console.log();
            console.log(chalk.cyan.bold('📊 详细结果:'));
            console.log();

            for (const playerKey of Object.keys(result.results)) {
                const playerResult = result.results[playerKey];
                console.log(judgeEngine.getDetailedResult(playerResult));
                console.log();
            }
        }

    } catch (error) {
        console.log();
        console.log(chalk.red(`❌ 评测失败: ${error.message}`));
        if (options.verbose && error.stack) {
            console.log(chalk.gray(error.stack));
        }
        process.exit(1);
    }
}

module.exports = judge;