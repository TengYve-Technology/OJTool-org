#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

// 命令模块
const doctor = require('../src/commands/doctor');
const config = require('../src/commands/config');
const judge = require('../src/commands/judge');
const init = require('../src/commands/init');

// 版本信息
program
    .version(pkg.version)
    .description('🧪 OJTool - 命令行代码评测工具');

// doctor 命令
program
    .command('doctor')
    .description('检测环境（g++、评测机、配置）')
    .action(doctor);

// init 命令
program
    .command('init')
    .description('初始化配置文件')
    .action(init);

// config 命令
program
    .command('config')
    .description('查看或修改配置')
    .option('--show', '显示当前配置')
    .option('--edit', '用编辑器打开配置文件')
    .option('--reset', '重置为默认配置')
    .action(config);

// judge 命令
program
    .command('judge')
    .description('执行评测')
    .option('-n, --players <count>', '选手数量')
    .option('--path <basePath>', '基础路径（选手目录所在路径）')
    .option('-v, --verbose', '详细输出模式')
    .option('-d, --detail', '显示详细评测结果')
    .action(judge);

// 未知命令提示
program.on('command:*', () => {
    console.error(chalk.red('❌ 未知命令，请使用 ojtool --help 查看可用命令'));
    process.exit(1);
});

// 解析参数
program.parse(process.argv);

// 如果没有输入任何命令，显示帮助
if (!process.argv.slice(2).length) {
    program.outputHelp();
}