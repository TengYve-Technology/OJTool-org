# OJTool - 命令行代码评测工具

一个轻量级的命令行代码评测工具，支持多选手单题目评测。使用 C++ 实现高性能评测引擎，Node.js 提供友好的 CLI 界面。

## 功能特点

- 🚀 **高性能评测**：C++ 评测引擎，支持超时检测、输入输出重定向
- 👥 **多选手评测**：支持同时评测多个选手的代码
- 📊 **详细结果**：每个测试点的状态、得分、总分统计
- 🔧 **灵活配置**：JSON 格式配置文件，支持环境变量路径
- 🧹 **自动清理**：评测后自动清理临时文件（.exe、.out）
- 🌈 **彩色输出**：友好的命令行界面，支持详细/简洁模式

## 项目结构

```
OJTool/
├── bin/
│   ├── ojtool.js          # CLI 入口
│   └── judger.exe         # C++ 评测引擎
├── src/
│   ├── commands/          # 命令实现
│   │   ├── doctor.js      # 环境检测
│   │   ├── init.js        # 初始化配置
│   │   ├── config.js      # 配置管理
│   │   └── judge.js       # 评测命令
│   ├── core/              # 核心模块
│   │   ├── configmanager.js  # 配置管理
│   │   └── judgeengine.js    # 评测引擎（Node.js层）
│   └── utils/             # 工具模块
│       ├── logger.js      # 日志工具
│       └── gppdetect.js   # g++ 检测
├── Example/               # 示例文件
│   ├── ojtool.json        # 示例配置
│   ├── 1/sum.cpp          # 选手1代码（正确版本）
│   ├── 2/sum.cpp          # 选手2代码（错误版本）
│   ├── sum1.in/ans        # 测试点1
│   ├── sum2.in/ans        # 测试点2
│   └── sum3.in/ans        # 测试点3
├── 评测机v0.0.3-CUI.cpp   # C++ 评测机源码
├── package.json           # Node.js 依赖
└── ojtool.json            # 当前配置文件
```

## 安装

### 前置要求

- Node.js >= 14
- g++ 编译器（MinGW 或其他）

### 全局安装

```bash
# 从 npm 全局安装（上传后可用）
npm install -g OJTool

# 或本地开发安装
npm install -g .
```

> **注意**：安装时会自动编译 C++ 评测机。如果编译失败，请手动执行：
> ```bash
> g++ -o bin/judger.exe judger.cpp -std=c++17 -O2 -static
> ```

### 验证安装

```bash
# 查看版本
ojtool --version

# 或使用简写命令
ojt --version

# 环境检测
ojtool doctor
```

## 快速开始

### 1. 环境检测

```bash
ojtool doctor
# 或
ojt doctor
```

检查 g++、配置文件、目录权限、评测机是否就绪。

### 2. 运行示例评测

```bash
# 使用 Example 目录的示例
ojtool judge -d
# 或
ojt judge -d
```

预期结果：
- 选手 1（加法实现）：全部 AC，总分 30/30
- 选手 2（减法实现）：全部 WA，总分 0/30

### 3. 初始化配置

```bash
ojtool init
# 或
ojt init
```

按提示输入配置信息，生成 `ojtool.json`。

## 使用指南

### 配置文件说明

`ojtool.json` 配置项：

```json
{
  "version": "1.0.0",
  "gppPath": "g++",
  "problemPrefix": "sum",
  "testCaseCount": 3,
  "timeLimitMs": 1000,
  "scorePerCase": 10,
  "cppVersion": 17,
  "compileFlags": "-O2 -Wall",
  "outputLimitKb": 1024,
  "playerCount": 2,
  "basePath": "./Example/",
  "directories": {
    "input": "./data/in",
    "output": "./data/out",
    "answer": "./data/ans",
    "temp": "./temp"
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `problemPrefix` | 题目前缀（文件名前缀） | `problem` |
| `testCaseCount` | 测试用例数量 | `10` |
| `timeLimitMs` | 时间限制（毫秒） | `1000` |
| `scorePerCase` | 每测试点分值 | `10` |
| `playerCount` | 选手数量 | `1` |
| `basePath` | 基础路径（支持环境变量） | 桌面路径 |
| `cppVersion` | C++ 标准版本 | `17` |

### 目录结构约定

评测数据目录结构：

```
{basePath}/
├── 1/                    # 选手 1 目录
│   └── {problemPrefix}.cpp  # 选手代码
├── 2/                    # 选手 2 目录
│   └── {problemPrefix}.cpp
├── {problemPrefix}1.in   # 测试点 1 输入
├── {problemPrefix}1.ans  # 测试点 1 答案
├── {problemPrefix}2.in   # 测试点 2 输入
├── {problemPrefix}2.ans  # 测试点 2 答案
└── ...
```

### 命令详解

#### 命令别名

支持两种命令形式：
- `ojtool` - 完整命令
- `ojt` - 简写命令（完全等效）

#### doctor - 环境检测

```bash
ojtool doctor
# 或
ojt doctor
```

检测内容：
- g++ 编译器
- 配置文件
- 目录权限
- 评测机 exe

#### init - 初始化配置

```bash
ojtool init
# 或
ojt init
```

交互式创建配置文件。

#### config - 配置管理

```bash
# 查看配置
ojtool config --show
# 或
ojt config --show

# 重置为默认配置
ojtool config --reset
# 或
ojt config --reset

# 设置配置
ojtool config --set problemPrefix=sum
# 或
ojt config --set problemPrefix=sum
```

#### judge - 执行评测

```bash
# 使用默认配置评测
ojtool judge
# 或
ojt judge

# 指定选手数量
ojtool judge --players 10
# 或
ojt judge --players 10

# 指定基础路径
ojtool judge --path ./contest
# 或
ojt judge --path ./contest

# 显示详细结果
ojtool judge -d
# 或
ojt judge -d

# 详细日志模式
ojtool judge -v
# 或
ojt judge -v

# 组合使用
ojtool judge -n 5 --path ./data -v -d
# 或
ojt judge -n 5 --path ./data -v -d
```

参数说明：
- `-n, --players <count>`：指定选手数量
- `--path <basePath>`：指定基础路径
- `-v, --verbose`：详细日志输出
- `-d, --detail`：显示详细评测结果

### 评测结果说明

| 状态 | 说明 |
|------|------|
| Accepted (AC) | 答案正确 |
| Wrong Answer (WA) | 答案错误 |
| Time Limit Exceeded (TLE) | 运行超时 |
| Runtime Error (RTE) | 运行时错误 |
| Compile Error (CE) | 编译错误 |
| Output Limit Exceeded (OLE) | 输出超限 |

## 安全特性

- 🔒 **命令注入防护**：路径过滤危险字符
- 🔒 **路径遍历防护**：禁止 `..` 路径遍历
- 🧹 **临时文件自动清理**：评测后自动删除 .exe 和 .out 文件

## 修复记录

### v1.0.0 (2026-06-27)

**新增功能：**
- 完整的评测功能（编译、运行、超时检测、结果比对）
- 多选手单题目评测
- 彩色命令行界面
- 自动清理临时文件
- Example 示例目录

**Bug 修复：**
- 修复 C++ 评测机输入重定向缺失问题
- 修复 C++ 评测机输出句柄继承问题
- 修复 C++ 评测机未解析 basePath 配置的问题
- 修复命名不一致导致的跨平台兼容问题
- 修复 config --reset 功能缺失

**安全修复：**
- 修复编译命令注入漏洞
- 添加路径遍历防护

## 未来计划

- [ ] 多题目评测支持
- [ ] Python 语言支持
- [ ] Java 语言支持
- [ ] 内存限制检测
- [ ] 评测报告文件生成（JSON/HTML）
- [ ] 竞赛模式（排名统计）
- [ ] 远程评测支持（Codeforces、AtCoder 等）

## License

MIT
