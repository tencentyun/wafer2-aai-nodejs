/**
 * 小程序配置文件
 */

// 此处主机域名修改成腾讯云解决方案分配的域名
var host = 'https://465712482.ijason.club/weapp';

var config = {

    // 下面的地址配合云端 Demo 工作
    service: {
        host,
        
        // 语音识别接口
        voiceUrl: `${host}/recognize`
    }
};

module.exports = config;