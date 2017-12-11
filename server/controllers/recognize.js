const { voice, config } = require('../qcloud')
const ffmpeg = require('fluent-ffmpeg')
const multiparty = require('multiparty')
const readChunk = require('read-chunk')
const fileType = require('file-type')
const shortid = require('shortid')
const fs = require('fs')

/**
 * 语音识别
 * 这里使用流式语音识别
 * 有任何问题可以到 issue 提问
 */
module.exports = async ctx => {
    // 处理文件上传
    const { files } = await resolveUploadFileFromRequest(ctx.req)
    const imageFile = files.file[0]

    // 只能上传 mp3 文件
    const buffer = readChunk.sync(imageFile.path, 0, 262)
    let resultType = fileType(buffer)

    // 如果无法获取文件的 MIME TYPE 就取 headers 里面的 content-type
    if (resultType === null && imageFile.headers && imageFile.headers['content-type']) {
        const tmpPathArr = imageFile.path ? imageFile.path.split('.') : []
        const extName = tmpPathArr.length > 0 ? tmpPathArr[tmpPathArr.length - 1] : ''
        resultType = {
            mime: imageFile.headers['content-type'],
            ext: extName
        }
    }

    if (!resultType || !['audio/mpeg', 'audio/mp3'].includes(resultType.mime)) {
        throw new Error('上传的文件格式不是 mp3')
    }

    const srcPath = imageFile.path
    /**
     * 语音识别只支持如下编码格式的音频：
     * pcm、adpcm、feature、speex、amr、silk、wav
     * 所以必须把 mp3 格式的上传文件转换为 wav
     * 这里使用 ffmpeg 对音频进行转换
     */
    const newVoiceKey = `voice-${Date.now()}-${shortid.generate()}.wav`
    const newVoicePath = `/tmp/${newVoiceKey}`
    const voiceId = genRandomString(16)
    await convertMp3ToWav(srcPath, newVoicePath)

    const voiceBuffer = fs.readFileSync(newVoicePath)

    const taskList = []
    let leftBufferSize = 0
    let idx = 0

    while (leftBufferSize < voiceBuffer.length) {
        const newBufferSize = leftBufferSize + 9 * 1024
        const chunk = voiceBuffer.slice(leftBufferSize, newBufferSize > voiceBuffer.length ? voiceBuffer.length : newBufferSize)

        taskList.push(
            voice.recognize(chunk, newBufferSize > voiceBuffer.length, voiceId, idx)
        )

        leftBufferSize = newBufferSize
        idx++
    }

    try {
        const data = await Promise.all(taskList)
        const res = data.map(d => d.data)
        console.log(res)
        ctx.state.data = res
    } catch (e) {
        console.log(e)
        throw e
    }
}

function genRandomString (len) {
    let text = ''
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < len; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return text
}

/**
 * mp3 转 wav
 * @param {string} srcPath 源文件地址
 * @param {string} newPath 新文件地址
 */
function convertMp3ToWav (srcPath, newPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(srcPath)
            .format('wav')
            .on('error', reject)
            .on('end', function () {
                resolve(newPath)
            })
            .save(newPath)
    })
}

/**
 * 从请求体重解析出文件
 * 并将文件缓存到 /tmp 目录下
 * @param {HTTP INCOMING MESSAGE} req
 * @return {Promise}
 */
function resolveUploadFileFromRequest (request) {
    const maxSize = config.cos.maxSize ? config.cos.maxSize : 10

    // 初始化 multiparty
    const form = new multiparty.Form({
        encoding: 'utf8',
        maxFilesSize: maxSize * 1024 * 1024,
        autoFiles: true,
        uploadDir: '/tmp'
    })

    return new Promise((resolve, reject) => {
        // 从 req 读取文件
        form.parse(request, (err, fields = {}, files = {}) => {
            err ? reject(err) : resolve({fields, files})
        })
    })
}
