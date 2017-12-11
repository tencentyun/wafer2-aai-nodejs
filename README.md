# Wafer2 语音识别 Demo - Node.js

本 Demo 演示了 Wafer2 Node SDK 的语音识别功能。

> 使用语音识别需要开通腾讯云智能语音：https://console.cloud.tencent.com/aai

### 本地运行

打开 `server/config.js`，添加上 `qcloudAppId`，`qcloudSecretId`，`qcloudSecretKey` 三个配置项，并在代码目录中打开 CMD，运行如下代码：

```bash
# 切换到 server 目录
cd server

# 安装依赖
npm i

# 启动程序
npm run dev
```

接着使用微信开发者工具打开项目即可。
