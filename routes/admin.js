var express = require("express");
var router = express.Router();

const {
  pullService,
  getBranchsService,
  checkoutService,
  buildAndRemoveService,
  installService,
  getMenuService,
} = require("../service/adminService");

// 拉取最新代码
router.post("/pull/latest", async function (req, res, next) {
  pullService().then((resMsg) => {
    res.send({
      code: "200",
      msg: "拉取分支成功",
      data: resMsg,
    });
  });
});

// 获取所有最新分支名称
router.get("/branchs", async function (req, res, next) {
  getBranchsService()
    .then((resMsg) => {
      res.send({
        code: "200",
        msg: "获得分支列表成功",
        data: resMsg,
      });
    })
    .catch((err) => {
      res.send({
        code: "400",
        msg: "获得分支列表失败",
      });
    });
});

// 切换分支
router.post("/checkout/:name", async function (req, res, next) {
  checkoutService(req.params.name).then((resMsg) => {
    res.send({
      code: "200",
      msg: "切换分支成功",
      data: resMsg,
    });
  });
});

// 自动npm install
router.post("/install", async function (req, res, next) {
  installService().then((resMsg) => {
    res.send({
      code: "200",
      msg: "安装依赖成功",
      data: resMsg,
    });
  });
});

// 以某种方式打包并放到指定位置
router.post("/build/:type", async function (req, res, next) {
  console.log(req.params.type);
  buildAndRemoveService("npm run build").then((resMsg) => {
    res.send({
      code: "200",
      msg: "打包成功",
      data: resMsg,
    });
  });
});

// 获取文件目录
router.get("/menulist/*", async function (req, res, next) {
  getMenuService(req.params[0]).then((resMsg) => {
    console.log(
      "🚀这是自动生成的注释 ~ getMenuService ~ req.params.rest:",
      req.params[0]
    );

    const { type } = resMsg;
    if (type === "folder") {
      res.send({
        code: "200",
        msg: "获取文件目录成功",
        data: resMsg.menu,
      });
    } else if (type === "file") {
      const { fileStream } = resMsg;
      // 获取文件名称
      let filename = req.params[0].split("/");
      filename = filename[filename.length - 1];
      console.log(filename);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      fileStream.pipe(res);
    }
  });
});

module.exports = router;
