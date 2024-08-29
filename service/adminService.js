// admin 模块的业务逻辑层
const { spawn } = require("child_process");
const crossSpawn = require("cross-spawn");
const {
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  access,
  stat,
  readdir,
  constants,
  createReadStream,
} = require("node:fs");
const { rm, cp } = require("node:fs/promises");
const path = require("path");

// 拉取最新代码
module.exports.pullService = async function () {
  return new Promise((reslove, reject) => {
    console.log("正在拉取当前分支最新代码");
    // 执行 git pull
    const { stdout } = spawn("git", ["pull"], {
      cwd: process.env.GIT_PATH,
    });
    stdout.on("data", (msg) => {
      console.log(msg.toString());
    });
    stdout.on("close", (msg) => {
      console.log("结束", msg);
      reslove("success");
    });
  });
};

// 获得所有分支
module.exports.getBranchsService = async function () {
  return new Promise((reslove, reject) => {
    console.log("正在获取远程分支");
    // 用于存储分支名称的数组
    let branches = [];
    // 执行 git fetch
    const fetch = spawn("git", ["fetch", "origin"], {
      cwd: process.env.GIT_PATH,
    });

    // 监听 fetch 完成事件
    fetch.on("close", (code) => {
      if (code !== 0) {
        console.error("git fetch exited with code", code);
        return;
      }

      // fetch 成功后执行 git branch -r
      const branchList = spawn("git", ["branch", "-r"], {
        cwd: process.env.GIT_PATH,
      });

      // 监听分支列表输出
      branchList.stdout.on("data", (data) => {
        branches = data
          .toString()
          .split("\n")
          .filter(Boolean)
          .map((line) => line.trim());
        reslove(branches);
      });

      // 监听错误输出
      branchList.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      // 监听分支列表进程结束
      branchList.on("close", (code) => {
        if (code !== 0) {
          console.error("git branch -r exited with code", code);
        }
      });
    });

    // 监听错误事件
    fetch.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    // 监听 fetch 进程结束
    fetch.on("close", (code) => {
      if (code !== 0) {
        console.error("git fetch exited with code", code);
      }
    });
  });
};

// 切换分支
module.exports.checkoutService = async function (branchName) {
  return new Promise((reslove, reject) => {
    console.log("正在切换分支");
    // 执行 git fetch
    const { stdout } = spawn("git", ["checkout", branchName], {
      cwd: process.env.GIT_PATH,
    });
    stdout.on("data", (msg) => {
      console.log(msg.toString());
    });
    stdout.on("close", (msg) => {
      console.log("结束", msg);
      reslove("success");
    });
  });
};

// 自动install
module.exports.installService = async function () {
  return new Promise((reslove, reject) => {
    console.log("正在安装依赖");
    // 执行 npm install
    const { stdout } = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["install"],
      {
        cwd: process.env.GIT_PATH,
      }
    );
    stdout.on("data", (msg) => {
      console.log(msg.toString());
    });
    stdout.on("close", (msg) => {
      console.log("结束", msg);
      reslove("success");
    });
  });
};

// 运行指定的打包命令并将打包完成的文件放到指定位置
module.exports.buildAndRemoveService = async function (commandName) {
  return new Promise((reslove, reject) => {
    // 打包文件
    async function buildFiles() {
      return new Promise((reslove, reject) => {
        console.log("正在打包文件");
        // 执行 npm run build
        const { stdout, stderr } = spawn(
          process.platform === "win32" ? "npm.cmd" : "npm",
          ["run", "build"],
          {
            cwd: process.env.GIT_PATH,
          }
        );
        stdout.on("data", (msg) => {
          console.log(msg.toString());
        });
        stderr.on("data", (msg) => {
          console.log("报错", msg.toString());
          reject(msg);
        });
        stdout.on("close", (msg) => {
          console.log("结束", msg);
          reslove("success");
        });
      });
    }
    // 创建对应的版本文件(同时删除之前有的文件夹)
    function createFiles(version) {
      return new Promise((reslove, reject) => {
        if (existsSync(process.env.DIST_PATH + `\\${version}`)) {
          rm(process.env.DIST_PATH + `\\${version}`, {
            recursive: true,
          }).then((res) => {
            console.log("已经删除");
            mkdirSync(process.env.DIST_PATH + `\\${version}`, {
              recursive: true,
            });
            reslove("已经删除");
          });
        } else {
          mkdirSync(process.env.DIST_PATH + `\\${version}`, {
            recursive: true,
          });
          reslove("已经删除");
        }
        console.log("创建完成");
      });
    }

    // 将打包好的文件拷贝或者剪切过去
    function copyService(source, target) {
      if (existsSync(source) && existsSync(target)) {
        cp(source, target, {
          recursive: true,
        }).then((res) => {
          console.log("成功");
        });
      } else {
        console.log("不存在文件源");
      }
    }

    // 执行操作
    buildFiles().then((res) => {
      createFiles("001").then((res) => {
        copyService(
          `${process.env.GIT_PATH}\\dist`,
          `${process.env.DIST_PATH}\\001`
        );
        reslove("创建成功");
      });
    });
  });
};

// 获取打包版本管理文件的目录结构
module.exports.getMenuService = async function (fileRoute) {
  const directoryPath = path.join(process.env.DIST_PATH, fileRoute);
  return new Promise((reslove, reject) => {
    // 用于存储结果的数组
    let filesAndFolders = [];
    // 检查文件是否存在
    access(directoryPath, constants.F_OK, (err) => {
      if (err) {
        res.statusCode = 404;
        res.end("File not found");
        return;
      }

      // 检查是不是一个文件夹
      stat(directoryPath, (err, stats) => {
        if (err) {
          res.statusCode = 500;
          res.end("Internal server error");
          return;
        }

        if (stats.isDirectory()) {
          // 是一个文件夹
          // 读取目录中的文件和文件夹
          readdir(directoryPath, (err, files) => {
            console.log("🚀这是自动生成的注释 ~ readdir ~ files:", files);
            if (err) {
              console.error("Error reading the directory", err);
              return;
            }
            // 如果文件夹为空
            if (files.length === 0) {
              reslove({
                type: "folder",
                menu: [],
              });
            }

            // 遍历文件和文件夹
            files.forEach((file) => {
              // 获取文件的完整路径
              const filePath = path.join(directoryPath, file);

              // 使用fs.stat检查文件类型
              stat(filePath, (err, stats) => {
                if (err) {
                  console.error("Error stating file", err);
                  return;
                }

                // 根据stats判断是文件还是文件夹
                let type = stats.isDirectory() ? "folder" : "file";
                filesAndFolders.push({
                  name: file,
                  type: type,
                });

                // 如果所有文件和文件夹都已处理完毕，打印结果数组
                if (filesAndFolders.length === files.length) {
                  reslove({
                    type: "folder",
                    menu: filesAndFolders,
                  });
                }
              });
            });
          });
        } else {
          // 如果进入到这里说明是一个需要传输为下载的文件
          const fileStream = createReadStream(directoryPath);
          fileStream.on("open", () => {
            reslove({
              type: "file",
              fileStream: fileStream,
            });
          });
          fileStream.on("error", (err) => {
            reject(err);
          });
        }
      });
    });
  });
};

// 获得log日志
module.exports.getLogs = async function () {
  return new Promise((reslove, reject) => {
    console.log(process.platform);

    const { stdout, stderr } = crossSpawn("pm2", ["logs"]);

    // 将子进程的输出数据流转换为字符串
    let logsData = "";
    stdout.on("data", (data) => {
      logsData += data;
      console.log("实时信息开始", logsData, "实时信息暂时结束");
    });

    // 监听子进程的结束事件
    stdout.on("close", (code) => {
      if (code === 0) {
        // 命令执行成功，返回日志数据
        reslove(logsData);
      } else {
        // 命令执行失败，返回错误信息
        reslove(`PM2 logs command failed with code ${code}`);
      }
    });

    stderr.on("data", (data) => {
      // 将标准错误输出也返回给客户端
      reslove(`PM2 logs error: ${data}`);
    });
  });
};
