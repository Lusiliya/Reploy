# Reploy - 工作空间仓库管理器

Reploy 是一个强大的命令行工具，用于管理多个 Git 仓库的工作空间。它支持多工作空间、自动化操作、管道执行等功能，特别适合需要同时管理多个项目的开发者。

## 功能特性

- 🚀 **快速扫描**: 扫描指定工作区的所有 Git 仓库
- 🔄 **Git 操作**: 拉取、获取、分支切换等 Git 操作
- 📦 **依赖管理**: 自动安装前端和后端依赖
- 🏗️ **构建系统**: 支持前端和后端构建
- 🎯 **开发模式**: 一键启动前端开发服务器
- 🔧 **管道系统**: 自定义操作管道，支持并行和顺序执行
- 🏢 **多工作空间**: 支持多个独立的工作空间管理
- 🚫 **忽略列表**: 灵活配置需要跳过的仓库
- 🌐 **远程管理**: 智能管理不同平台的远程仓库
- 🪟 **独立窗口**: 管道命令在独立命令行窗口中执行

## 安装

### 前置要求

- Node.js 18+ 
- npm (推荐) 或 yarn
- Git
- Windows PowerShell (Windows 用户)
- **后端开发** (可选):
  - .NET SDK (用于 .NET 项目)
  - Java JDK + Maven 或 Gradle (用于 Java 项目)

### 安装步骤

1. 克隆或下载 Reploy 项目
2. 安装依赖：
   ```bash
   # 使用 npm (推荐)
   npm install
   
   # 或使用 yarn
   yarn install
   ```
3. 构建项目：
   ```bash
   # 使用 npm
   npm run build
   
   # 或使用 yarn
   yarn build
   ```

### 运行方式

**方式一：全局安装（推荐）**
```bash
npm link
reploy <command>
```

**方式二：直接运行**
```bash
node dist/index.js <command>
```

## 快速开始

### 1. 初始化配置

```bash
# 生成默认空配置文件
reploy init

# 扫描指定目录并自动发现仓库
reploy init --root E:\workspace

# 全盘扫描所有驱动器（Windows）
reploy init --full-scan
```

### 2. 扫描仓库

```bash
# 扫描当前目录
reploy scan --write

# 扫描指定目录
reploy scan --root E:\workspace\develop --write

# 扫描到指定工作空间
reploy scan --root E:\workspace\release --target-workspace release --write
```

### 3. 基本操作

```bash
# 拉取所有仓库最新代码
reploy pull --all

# 拉取指定仓库
reploy pull --repo gces-server

# 安装所有仓库依赖
reploy install --all

# 构建所有仓库
reploy build --all
```

## 详细命令说明

### 工作空间管理

#### `reploy workspace`

管理多个工作空间：

```bash
# 查看所有工作空间
reploy workspace list

# 查看当前工作空间
reploy workspace current

# 切换到指定工作空间
reploy workspace use develop

# 设置默认工作空间
reploy workspace set-default develop

# 移动仓库到其他工作空间
reploy workspace move gces-server release
```

#### `reploy init`

初始化配置文件：

```bash
# 生成空配置文件
reploy init

# 扫描指定目录
reploy init --root E:\workspace

# 全盘扫描
reploy init --full-scan

# 指定输出文件
reploy init --output my-config.json
```

#### `reploy scan`

扫描和发现仓库：

```bash
# 扫描当前目录
reploy scan

# 扫描指定目录
reploy scan --root E:\workspace\develop

# 扫描并写入配置
reploy scan --write

# 扫描到指定工作空间
reploy scan --target-workspace release --write
```

### Git 操作

#### `reploy pull`

拉取最新代码：

```bash
# 拉取所有仓库
reploy pull --all

# 拉取指定仓库
reploy pull --repo gces-server
```

#### `reploy fetch`

获取远程更新：

```bash
# 获取所有仓库
reploy fetch --all

# 获取指定仓库
reploy fetch --repo gces-server
```

#### `reploy branch`

分支管理：

```bash
# 切换到指定分支
reploy branch --repo gces-server --branch feature/new-feature

# 切换到 develop 分支
reploy branch --repo gces-server --develop

# 切换到 release 分支
reploy branch --repo gces-server --release 9.0

# 所有仓库切换到 develop
reploy branch --all --develop
```

### 依赖和构建

#### `reploy install`

安装依赖：

```bash
# 安装所有仓库依赖
reploy install --all

# 安装指定仓库依赖
reploy install --repo gces-server
```

支持的包管理器：
- **前端**: yarn (优先), npm, pnpm
- **后端**: 
  - .NET: dotnet restore (需要 .sln 文件)
  - Java: Maven (mvn dependency:resolve) 或 Gradle (gradle dependencies)

#### `reploy build`

构建项目：

```bash
# 构建所有仓库
reploy build --all

# 构建指定仓库
reploy build --repo gces-server
```

支持的构建类型：
- **前端**: yarn build, npm run build
- **后端**: 
  - .NET: dotnet build (需要 .sln 文件)
  - Java: Maven (mvn clean package -DskipTests) 或 Gradle (gradle build -x test)

#### `reploy dev`

启动开发服务器：

```bash
# 启动所有前端项目
reploy dev --all

# 启动指定项目
reploy dev --repo gces-ui
```

### 远程仓库管理

#### `reploy remote`

检查和修复远程URL：

```bash
# 检查所有仓库远程URL
reploy remote --all

# 检查指定仓库
reploy remote --repo gces-server

# 修复错误的远程URL
reploy remote --all --fix
```

支持的仓库类型：
- **Gitea 仓库**: 自动修复为正确的项目URL
- **外部仓库**: 保持原始URL（GitHub, Bitbucket等）

### 管道系统

#### `reploy pipeline`

执行预定义的操作管道：

```bash
# 运行指定管道
reploy pipeline run deploy-gces

# 运行前端启动管道
reploy pipeline run start-frontend
```

管道特性：
- 支持并行与顺序：同一步内可并行执行；所有并行命令完成后再进入下一步
- 新窗口执行：可按 step 或 command 级配置 `openWindow`；默认 `false`
  - 优先级：command 级 `openWindow` > step 级 `openWindow` > 默认值
  - 新窗口内会保持打开（已追加 `pause`），便于查看日志和错误
- 失败处理：继续执行后续步骤，结束后输出失败步骤/命令的汇总
- 自动传递工作空间参数
- 动态解析工作目录：支持通过 `repo` 与 `path` 自动定位 `cwd`

### 其他功能

#### `reploy ignore`

管理忽略列表：

```bash
# 查看忽略列表
reploy ignore list

# 添加忽略仓库
reploy ignore add Wyn-Embed-Playground

# 移除忽略仓库
reploy ignore remove Wyn-Embed-Playground
```

#### `reploy demo`

启动演示：

```bash
# 启动指定仓库的演示
reploy demo --repo gces-ui
```

## 配置文件

### 配置文件结构

```json
{
  "defaultWorkspace": "develop",
  "workspaces": {
    "develop": {
      "workspace": "E:\\workspace\\develop",
      "concurrency": 6,
      "remoteUrlPattern": "https://gitea.example.com/{project}/{name}.git",
      "repos": [
        {
          "name": "gces-server",
          "path": "E:\\workspace\\develop\\gces-server",
          "type": "backend",
          "packageManager": "yarn",
          "dotnet": {
            "solution": "Gces.Server.Dev.sln"
          }
        }
      ],
      "ignores": ["Wyn-Embed-Playground"],
      "pipelines": [
        {
          "name": "deploy-gces",
          "description": "一键重新部署 gces-server, gces-common, gces-analysis",
          "steps": [
            {
              "name": "fetch-and-pull",
              "commands": [
                "fetch --repo gces-server",
                "pull --repo gces-server"
              ],
              "parallel": true
            }
          ]
        }
      ]
    }
  }
}
```

### 配置说明

- **defaultWorkspace**: 默认工作空间名称
- **workspaces**: 工作空间配置对象
- **workspace**: 工作空间根目录
- **concurrency**: 并发执行数量
- **remoteUrlPattern**: 远程URL模式，`{name}` 会被仓库名替换
- **repos**: 仓库列表
- **ignores**: 忽略的仓库列表
- **pipelines**: 预定义管道

#### `openWindow` 说明
- 配置位置：
  - step 级：对该步骤内未显式配置 `openWindow` 的命令生效
  - command 级：仅对该命令生效，优先级高于 step 级
- 默认值：`false`
- 典型示例：
  ```json
  {
    "name": "example",
    "steps": [
      {
        "name": "command-level",
        "parallel": true,
        "commands": [
          { "command": "echo A", "openWindow": true },
          { "command": "echo B", "openWindow": false }
        ]
      },
      {
        "name": "step-level",
        "openWindow": true,
        "parallel": true,
        "commands": [
          { "command": "echo C" },
          { "command": "echo D" }
        ]
      }
    ]
  }
  ```

### 仓库配置

```json
{
  "name": "仓库名称",
  "path": "仓库路径",
  "type": "frontend|backend",
  "packageManager": "yarn|npm|pnpm",
  "dotnet": {
    "solution": "解决方案文件名.sln"
  },
  "java": {
    "buildTool": "maven|gradle"
  },
  "demo": {
    "start": "启动命令"
  },
  "integration": {
    "start": "集成启动命令"
  }
}
```

## 管道配置

### 简单管道

```json
{
  "name": "simple-pipeline",
  "steps": [
    "pull --all",
    "install --all",
    "build --all"
  ]
}
```

### 复杂管道

```json
{
  "name": "complex-pipeline",
  "steps": [
    {
      "name": "fetch-and-pull",
      "commands": [
        "fetch --repo gces-server",
        "pull --repo gces-server"
      ],
      "parallel": true
    },
    {
      "name": "dotnet-restore",
      "commands": [
        {
          "repo": "gces-server",
          "command": "dotnet restore Gces.Server.Dev.sln"
        }
      ],
      "parallel": true
    }
  ]
}
```

### 测试管道示例
用于快速验证新窗口打开与保持：

```json
{
  "name": "test-window",
  "description": "测试新窗口功能",
  "steps": [
    {
      "name": "simple-test",
      "parallel": true,
      "commands": [
        { "command": "echo 这是一个测试窗口，应该保持打开", "openWindow": true },
        { "command": "echo 这是第二个测试窗口", "openWindow": true }
      ]
    }
  ]
}
```

运行：
```bash
reploy pipeline run test-window
```

### 管道命令类型

1. **简单字符串**: `"pull --all"`
2. **对象命令**: 
   ```json
   {
     "repo": "gces-server",
     "path": "src/ClientApp",
     "command": "yarn install",
     "cwd": "自定义工作目录"
   }
   ```

## 工作空间管理

### 多工作空间支持

Reploy 支持多个独立的工作空间：

- **develop**: 开发环境
- **release**: 发布环境
- **custom**: 自定义工作空间

### 工作空间切换

```bash
# 查看当前工作空间
reploy workspace current

# 切换到指定工作空间
reploy --workspace release pull --all

# 设置默认工作空间
reploy workspace set-default release
```

### 仓库移动

```bash
# 将仓库移动到其他工作空间
reploy workspace move gces-server release
```

## 远程仓库支持

### Gitea 仓库

自动支持 Gitea 仓库，URL 格式：
- `https://gitea.example.com/{project}/{name}.git`

### 外部仓库

支持外部仓库，保持原始URL：
- GitHub: `https://github.com/user/repo.git`
- Bitbucket: `https://bitbucket.org/user/repo.git`

## 错误处理

### 批量操作错误处理

- **单个仓库失败**: 记录错误并继续执行其他仓库
- **管道失败**: 停止整个管道执行
- **网络错误**: 自动重试机制

### 常见问题

1. **SSL 连接错误**: 检查网络连接和证书
2. **仓库不存在**: 使用 `reploy remote --all` 检查远程URL
3. **权限问题**: 确保有仓库访问权限
4. **路径不存在**: 检查配置文件中的路径设置

## 高级用法

### 环境变量

```bash
# 指定配置文件路径
export REPLOY_CONFIG=/path/to/config.json

# 使用环境变量
reploy pull --all
```

### 命令行参数

```bash
# 指定配置文件
reploy --config /path/to/config.json pull --all

# 指定工作空间
reploy --workspace release pull --all
```

### 脚本集成

```bash
#!/bin/bash
# 部署脚本
reploy --workspace release pipeline run deploy-gces
```

## 最佳实践

1. **工作空间分离**: 使用不同工作空间管理不同环境
2. **忽略配置**: 将不需要的仓库添加到忽略列表
3. **管道复用**: 创建可复用的管道配置
4. **定期同步**: 定期执行 `pull --all` 保持代码最新
5. **错误监控**: 关注批量操作的错误日志

## 故障排除

### 调试模式

```bash
# 详细输出
reploy --verbose pull --all

# 检查配置
reploy workspace current
```

### 日志查看

所有操作都会输出详细的日志信息，包括：
- 执行命令
- 工作目录
- 错误信息
- 执行结果

### 配置验证

```bash
# 检查远程URL
reploy remote --all

# 验证仓库路径
reploy scan --root E:\workspace
```

## 更新日志

### v0.1.0
- 初始版本发布
- 支持基本 Git 操作
- 多工作空间管理
- 管道系统
- 远程仓库管理

## 贡献

欢迎提交 Issue 和 Pull Request 来改进 Reploy。

## 许可证

ISC License

---

**Reploy** - 让多仓库管理变得简单高效！