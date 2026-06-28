const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { resetConfig } = require('../core/configmanager');

module.exports = function config(options) {
    const configPath = path.join(process.cwd(), 'ojtool.json');

    if (options.show) {
        if (!fs.existsSync(configPath)) {
            console.log(chalk.red('❌ 配置文件不存在，请运行 ojtool init 创建'));
            return;
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log(chalk.blue('📄 当前配置:'));
        console.log(JSON.stringify(config, null, 2));
        return;
    }

    if (options.edit) {
        if (!fs.existsSync(configPath)) {
            console.log(chalk.red('❌ 配置文件不存在，请运行 ojtool init 创建'));
            return;
        }
        console.log(chalk.blue(`📝 正在打开配置文件: ${configPath}`));
        exec(`notepad "${configPath}"`, (err) => {
            if (err) console.log(chalk.yellow('⚠️  无法打开编辑器，请手动编辑文件'));
        });
        return;
    }

    if (options.reset) {
        resetConfig();
        console.log(chalk.green('✅ 配置已重置为默认值'));
        return;
    }

    console.log(chalk.yellow('💡 请使用: ojtool config --show 或 --edit 或 --reset'));
};