var noop = function () {};
var timer = null;

/**
 * 语音识别接口
 * 注意：必须配合服务端 DEMO 和 SDK 使用，请参考服务端 DEMO 代码
 * @param {object} options 配置项
 * @param {string} options.localPath    语音本地存放路径
 * @param {string} options.recognizeUrl 语音识别接口
 * @param {string} options.inquireUrl   语音识别结果查询地址
 * @param {string} options.requestId    请求ID，如果有 requestId 就不再请求识别，直接查询结果
 * @param {function} options.requested  语音识别请求成功回调
 * @param {function} options.success    语音识别成功之后回调
 * @param {function} options.fail       语音识别失败后回调
 * @param {function} options.complete   成功和失败都会调用
 */
function recognize (options) {
    var localPath = options.localPath;
    var recognizeUrl = options.recognizeUrl;
    var inquireUrl = options.inquireUrl;
    var requested = options.requested;
    var success = options.success;
    var fail = options.fail;
    var complete = options.complete;

    requested = requested || noop;
    success = success || noop;
    fail = fail || noop;
    complete = complete || noop;

    if (!localPath) {
        throw new Error('[Wafer SDK] `options.localPath` cannot be empty');
    } else if (!recognizeUrl) {
        throw new Error('[Wafer SDK] `options.recognizeUrl` cannot be empty');
    } else if (!inquireUrl) {
        throw new Error('[Wafer SDK] `options.inquireUrl` cannot be empty');
    }

    // 上传并提交识别成功
    function onUploadSuccess (res) {
        res = res.data
        if (typeof res === 'string') {
            res = JSON.parse(res);
        }

        if (res.code === 0 && res.data && res.data.code === 0) {
            var requestId = res.data.requestId;

            // 调用回调
            requested(requestId);

            asyncInquireJobResult(requestId);

            // 5 秒轮询一次
            timer = setInterval(function () {
                asyncInquireJobResult(requestId);
            }, 2 * 1000);
        } else {
            onSomewhereError(res);
        }
    }

    // 异步轮询接口
    function asyncInquireJobResult (requestId) {
        wx.request({
            url: inquireUrl,
            data: {
                requestId: requestId
            },
            method: 'GET',
            success: onInquireSuccess,
            fail: onSomewhereError
        })
    }

    function onInquireSuccess (res) {
        res = res.data
        // 查询到任务，并且任务还未有结果
        if (res.code === 1) {
            return;
        }
        
        // 没查询到任务
        if (res.code === 2) {
            res.message = '未查询到相关任务';
            onSomewhereError(res);
            clearInterval(timer);
            return;
        }

        // 查询到任务，并且任务结束
        success(res.data);
        complete();
        clearInterval(timer);
    }

    // 集中处理错误
    function onSomewhereError (e) {
        fail(e);
        complete();
    }

    wx.uploadFile({
        url: recognizeUrl,
        filePath: localPath,
        name: 'file',
        success: onUploadSuccess,
        fail: onSomewhereError
    });
}

module.exports = {
    recognize: recognize
}
