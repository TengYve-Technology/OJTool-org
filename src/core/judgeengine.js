const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * 获取评测机路径
 * @returns {string} - 评测机可执行文件路径
 */
function getJudgerPath() {
    return path.join(__dirname, '../../bin/judger.exe');
}

/**
 * 验证路径是否安全（在工作目录范围内）
 * @param {string} basePath - 要验证的基础路径
 * @returns {boolean} - 路径是否安全
 */
function isPathSafe(basePath) {
    try {
        const absolutePath = path.resolve(basePath);
        const normalized = path.normalize(absolutePath);
        if (normalized.includes('..')) {
            return false;
        }
        
        if (process.platform === 'win32') {
            if (absolutePath.includes('~')) {
                return false;
            }
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * 执行评测
 * @param {Object} config - 配置对象
 * @param {Object} options - 额外选项
 * @param {number} options.playerCount - 选手数量
 * @param {string} options.basePath - 基础路径
 * @param {boolean} options.verbose - 是否详细输出
 * @returns {Promise<Object>} - 评测结果
 */
async function runJudge(config, options = {}) {
    logger.setVerbose(options.verbose || false);

    const judgerPath = getJudgerPath();
    const configPath = path.join(process.cwd(), 'ojtool.json');

    // 检查judger.exe是否存在
    if (!fs.existsSync(judgerPath)) {
        logger.error('评测机不存在，请先编译 judger.exe');
        throw new Error('judger.exe not found');
    }

    // 检查配置文件是否存在
    if (!fs.existsSync(configPath)) {
        logger.error('配置文件 ojtool.json 不存在，请先运行 ojtool init 初始化');
        throw new Error('ojtool.json not found');
    }

    // 获取评测所需参数
    const playerCount = options.playerCount || config.playerCount;
    const basePath = options.basePath || config.basePath;
    const testCaseCount = config.testCaseCount || 1;
    const timeLimitMs = config.timeLimitMs || 1000;

    if (!playerCount) {
        logger.error('缺少选手数量配置，请在 ojtool.json 中配置 playerCount 或通过参数指定');
        throw new Error('playerCount is required');
    }

    if (!basePath) {
        logger.error('缺少基础路径配置，请在 ojtool.json 中配置 basePath 或通过参数指定');
        throw new Error('basePath is required');
    }

    // 验证basePath安全性
    if (!isPathSafe(basePath)) {
        logger.error('路径遍历检测: basePath 不允许包含 ".." 或其他危险路径组件');
        throw new Error('Invalid basePath: path traversal detected');
    }

    // 动态计算超时时间：每个选手每个测试点的超时 * 测试点数量 * 选手数量 + 编译时间(每个选手10秒) + 额外缓冲(60秒)
    const compileTimePerPlayer = 10000;
    const bufferTime = 60000;
    const timeoutMs = playerCount * (testCaseCount * timeLimitMs + compileTimePerPlayer) + bufferTime;
    const maxTimeoutMs = 30 * 60 * 1000;
    const finalTimeoutMs = Math.min(timeoutMs, maxTimeoutMs);

    logger.info('开始评测...');
    logger.debug(`评测机路径: ${judgerPath}`);
    logger.debug(`配置文件路径: ${configPath}`);
    logger.debug(`选手数量: ${playerCount}`);
    logger.debug(`基础路径: ${basePath}`);
    logger.debug(`超时时间: ${finalTimeoutMs}ms`);

    return new Promise((resolve, reject) => {
        // 调用judger.exe（使用管道进行交互）
        const judger = spawn(judgerPath, [], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        let stdoutData = '';
        let stderrData = '';
        let isReadyForConfigPath = false;
        let configPathSent = false;

        let isCompleted = false;

        // 捕获标准输出
        judger.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutData += output;
            logger.debug(`[评测机输出] ${output.trim()}`);

            // 检测是否询问是否读取配置文件
            if (output.includes('是否读取配置文件') && !isReadyForConfigPath) {
                logger.debug('检测到配置文件询问，自动输入 y');
                judger.stdin.write('y\n');
                isReadyForConfigPath = true;
            }

            // 检测是否询问配置文件路径
            if (output.includes('输入配置文件路径') && isReadyForConfigPath && !configPathSent) {
                logger.debug(`发送配置文件路径: ${configPath}`);
                judger.stdin.write(configPath + '\n');
                configPathSent = true;
            }

            // 实时输出评测进度（可选）
            if (output.includes('选手') || output.includes(': Accepted') ||
                output.includes(': Wrong Answer') || output.includes(': Time Limit Exceeded') ||
                output.includes(': Runtime Error') || output.includes(': Compile Error')) {
                process.stdout.write(output);
            }

            // 检测评测是否完成
            if (output.includes('全部完成') && !isCompleted) {
                logger.debug('检测到评测完成信号');
                isCompleted = true;
                // 给一点时间让输出缓冲完成，然后结束进程
                setTimeout(() => {
                    if (!judger.killed) {
                        logger.debug('评测已完成，关闭评测机进程');
                        judger.kill();
                    }
                }, 500);
            }
        });

        // 捕获错误输出
        judger.stderr.on('data', (data) => {
            const error = data.toString();
            stderrData += error;
            logger.error(`[评测机错误] ${error.trim()}`);
        });

        // 处理进程关闭
        judger.on('close', (code) => {
            // 如果是正常完成评测后被kill，code可能为null或非0，这是正常的
            if (code !== 0 && code !== null && !isCompleted) {
                logger.error(`评测机异常退出，退出代码: ${code}`);
                logger.debug(`标准输出: ${stdoutData}`);
                logger.debug(`错误输出: ${stderrData}`);
                reject(new Error(`judger exited with code ${code}`));
                return;
            }

            logger.success('评测完成');
            logger.debug('开始解析评测结果...');

            // 清理临时文件
            cleanupTempFiles(config, playerCount, basePath);

            try {
                // 解析结果文件
                const results = parseResults(config, playerCount, basePath);
                resolve({
                    success: true,
                    results: results,
                    stdout: stdoutData,
                    stderr: stderrData
                });
            } catch (parseError) {
                logger.error(`解析结果失败: ${parseError.message}`);
                reject(parseError);
            }
        });

        // 处理进程错误
        judger.on('error', (error) => {
            logger.error(`启动评测机失败: ${error.message}`);
            reject(error);
        });

        // 设置动态超时
        setTimeout(() => {
            if (!judger.killed) {
                logger.warn('评测超时，正在终止评测机...');
                judger.kill();
                reject(new Error('评测超时'));
            }
        }, finalTimeoutMs);
    });
}

/**
 * 解析所有选手的评测结果文件
 * @param {Object} config - 配置对象
 * @param {number} playerCount - 选手数量
 * @param {string} basePath - 基础路径
 * @returns {Object} - 解析后的结果
 */
function parseResults(config, playerCount, basePath) {
    const results = {};
    const problemPrefix = config.problemPrefix || 'problem';

    logger.debug(`解析评测结果，选手数: ${playerCount}, 路径: ${basePath}`);

    // 遍历选手目录，读取结果文件
    for (let i = 1; i <= playerCount; i++) {
        const playerDir = path.join(basePath, String(i));
        const resultFile = path.join(playerDir, `${problemPrefix}_out.txt`);

        logger.debug(`检查选手 ${i} 结果文件: ${resultFile}`);

        if (fs.existsSync(resultFile)) {
            try {
                const content = fs.readFileSync(resultFile, 'utf-8');
                results[`player${i}`] = parseResultFile(content, i);
                logger.debug(`选手 ${i} 结果解析成功`);
            } catch (error) {
                logger.warn(`读取选手 ${i} 结果文件失败: ${error.message}`);
                results[`player${i}`] = {
                    error: '无法读取结果文件',
                    player: i
                };
            }
        } else {
            logger.warn(`选手 ${i} 结果文件不存在: ${resultFile}`);
            results[`player${i}`] = {
                error: '结果文件不存在',
                player: i
            };
        }
    }

    return results;
}

/**
 * 解析单个结果文件
 * @param {string} content - 结果文件内容
 * @param {number} playerNum - 选手编号
 * @returns {Object} - 解析后的结果对象
 */
function parseResultFile(content, playerNum) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const result = {
        player: playerNum,
        total: 0,
        maxScore: 0,
        cases: [],
        passed: 0,
        failed: 0
    };

    let foundTotal = false;

    for (const line of lines) {
        // 解析格式：Player N
        if (line.startsWith('Player')) {
            continue;
        }

        // 解析格式：编号 分值 状态
        const caseMatch = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
        if (caseMatch) {
            const caseNum = parseInt(caseMatch[1]);
            const score = parseInt(caseMatch[2]);
            const status = caseMatch[3].trim();

            result.cases.push({
                caseNum: caseNum,
                score: score,
                status: status,
                passed: status.toLowerCase() === 'accepted'
            });

            if (status.toLowerCase() === 'accepted') {
                result.passed++;
            } else {
                result.failed++;
            }
            continue;
        }

        // 解析最后一行：总分
        const totalMatch = line.match(/^(\d+)$/);
        if (totalMatch && !foundTotal) {
            result.total = parseInt(totalMatch[1]);
            foundTotal = true;
        }
    }

    // 计算总分（如果文件中没有总分行）
    if (!foundTotal) {
        result.total = result.cases.reduce((sum, c) => sum + c.score, 0);
    }

    // 计算满分
    result.maxScore = result.cases.length > 0 ?
        Math.max(...result.cases.map(c => c.score)) * result.cases.length : 0;

    return result;
}

/**
 * 评测完成后清理临时文件
 * @param {Object} config - 配置对象
 * @param {number} playerCount - 选手数量
 * @param {string} basePath - 基础路径
 */
function cleanupTempFiles(config, playerCount, basePath) {
    const problemPrefix = config.problemPrefix || 'problem';

    for (let i = 1; i <= playerCount; i++) {
        const playerDir = path.join(basePath, String(i));
        const exeFile = path.join(playerDir, `${problemPrefix}.exe`);
        const outFile = path.join(playerDir, `${problemPrefix}.out`);

        // 删除exe文件
        if (fs.existsSync(exeFile)) {
            try {
                fs.unlinkSync(exeFile);
                logger.debug(`已清理: ${exeFile}`);
            } catch (e) {
                logger.warn(`清理失败: ${exeFile}`);
            }
        }

        // 也清理.out文件（程序原始输出）
        if (fs.existsSync(outFile)) {
            try {
                fs.unlinkSync(outFile);
            } catch (e) {
                // 忽略
            }
        }
    }
}

/**
 * 打印评测结果摘要
 * @param {Object} results - 评测结果对象
 */
function printResultSummary(results) {
    logger.divider('=', 60);
    logger.title('评测结果摘要');
    logger.divider('-', 60);

    const players = Object.keys(results);
    let totalPassed = 0;
    let totalFailed = 0;

    for (const playerKey of players) {
        const player = results[playerKey];

        if (player.error) {
            console.log(`${playerKey}: ❌ ${player.error}`);
            totalFailed++;
            continue;
        }

        const status = player.passed === player.cases.length ? '✅' :
                      player.passed > 0 ? '⚠️' : '❌';

        console.log(`${playerKey}: ${status} 得分 ${player.total}/${player.maxScore} ` +
                   `(通过 ${player.passed}/${player.cases.length})`);

        if (player.passed === player.cases.length) {
            totalPassed++;
        } else {
            totalFailed++;
        }
    }

    logger.divider('-', 60);
    console.log(`\n总计: ${players.length} 名选手`);
    console.log(`  完全通过: ${totalPassed} 人`);
    console.log(`  部分通过/未通过: ${totalFailed} 人`);
    logger.divider('=', 60);
}

/**
 * 获取详细的评测结果字符串
 * @param {Object} playerResult - 单个选手的评测结果
 * @returns {string} - 格式化的结果字符串
 */
function getDetailedResult(playerResult) {
    if (playerResult.error) {
        return `错误: ${playerResult.error}`;
    }

    const lines = [`Player ${playerResult.player}`];
    for (const c of playerResult.cases) {
        const status = c.passed ? '✓' : '✗';
        lines.push(`  测试点 ${c.caseNum}: ${status} ${c.status} (${c.score}分)`);
    }
    lines.push(`总分: ${playerResult.total}/${playerResult.maxScore}`);

    return lines.join('\n');
}

module.exports = {
    getJudgerPath,
    runJudge,
    parseResults,
    parseResultFile,
    printResultSummary,
    getDetailedResult
};