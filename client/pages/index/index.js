const qcloud = require('../../vendor/wafer2-client-sdk/index')
const config = require('../../config');
const util = require('../../utils/util');
const dateformat = require('../../utils/dateformat');

// 处理录音逻辑
const recorderManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();

// 是否有文件正在播放
let isPlayingVoice = false;
// 正在播放的文件名
let playingVoiceKey = '';
// 正在播放的文件索引
let playingVoiceIndex = 0;

/**
 * PAGE 相关代码
 */
Page({
    data: {
        notes: []
    },

    onLoad () {
        // 读取储存着的笔记
        let notes = JSON.parse(wx.getStorageSync('notes') || '[]');

        // 添加播放标记
        notes = notes.map(v => {
            v.playing = false;
            
            if (v.isRec === true && !v.word) {
                v.isRec = false;
            }

            return v;
        })

        this.setData({ notes });
        recorderManager.onStop(this.onVoiceStop);
        // recorderManager.onFrameRecorded(res => {
        //     const { frameBuffer, isLastFrame } = res
        //     console.log('frameBuffer.byteLength', frameBuffer.byteLength)
        //     this.recognizeVoice({
        //         data: wx.arrayBufferToBase64(frameBuffer),
        //         isLastFrame: isLastFrame
        //     })
        // });
    },

    playVoice(e) {
        const path = e.currentTarget.dataset.voicepath;
        const key = e.currentTarget.dataset.voicekey;
        const idx = e.currentTarget.dataset.voiceidx;
        const notes = this.data.notes;

        /**
         * 如果有文件正在播放
         * 则停止正在播放的文件
         */
        if (isPlayingVoice) {
            innerAudioContext.stop();
            isPlayingVoice = false;
            notes[playingVoiceIndex].playing = false;
            this.setData({ notes });
        }

        /**
         * 如果正在播放的文件就是点击的这个文件
         * 则视为停止不再播放
         */
        if (playingVoiceKey === key) {
            playingVoiceKey = '';
            return;
        }

        isPlayingVoice = true;
        playingVoiceKey = key;
        playingVoiceIndex = idx;

        notes[idx].playing = true;
        this.setData({ notes });

        console.log('play voice', key);
        innerAudioContext.src = path;
        innerAudioContext.play();

        // 播放时间到了置回未播放
        setTimeout(() => {
            notes[idx].playing = false;
            this.setData({ notes });
        }, notes[idx].duration * 1000);
    },

    showVoiceActions (e) {
        const voiceKey = e.currentTarget.dataset.voicekey;
        const voice = this.data.notes.filter(v => v.key === voiceKey)[0];

        wx.showActionSheet({
            itemList: ['重新识别', '删除语音'],
            success: res => {
                if (res.tapIndex === 0) {
                    if (!voice.isRec || !voice.word) {
                        this.recognizeVoice(voice.key, voice.path);
                    }
                } else if (res.tapIndex === 1) {
                    this.deleteVoice(voiceKey);
                }
            }
        });
    },

    deleteVoice (key) {
        const notes = this.data.notes.filter(v => v.key !== key);
        this.saveToStorage(notes);
        this.setData({ notes });
    },

    voiceStartRecord () {
        console.log('start record');
        recorderManager.start({
            // 最大长度设置为 2 分钟
            duration: 2 * 60 * 1000,
            // 格式
            format: 'mp3',
            sampleRate: 16000,
            encodeBitRate: 25600,
            frameSize: 9,
            numberOfChannels: 1
        });
    },

    voiceEndRecord() {
        console.log('stop record');
        recorderManager.stop();
    },

    onVoiceStop (voiceInfo) {
        const { duration, tempFilePath } = voiceInfo;

        // 不允许小于 1 秒
        if (duration < 1000) {
            util.showTips('录音过短');
            return;
        }

        // 保存文件
        wx.saveFile({
            tempFilePath,
            success: fileInfo => {
                const { savedFilePath } = fileInfo;
                const voiceKey = `voicenote-${Date.now()}`

                // 生成笔记并保存再 storage
                const note = {
                    key: voiceKey,
                    path: savedFilePath,
                    duration: (duration / 1000).toFixed(2),
                    word: '',
                    isRec: false,
                    time: dateformat(new Date, 'YYYY-MM-DD HH:mm:ss')
                };

                const notes = this.data.notes.map(v => v);
                notes.unshift(note);

                this.recognizeVoice(voiceKey, savedFilePath);
                this.saveToStorage(notes);
                this.setData({ notes });
            },
            fail () {
                util.showModel('错误', '保存语音失败');
            }
        });
    },

    /**
     * 调用音频识别接口
     * @params {string} key 音频名称
     * @params {string} key 本地地址
     */
    recognizeVoice (key, path) {
        wx.uploadFile({
            url: config.service.voiceUrl,
            filePath: path,
            name: 'file',
            success: res => {
                let data = res.data;
                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }

                console.log(res);

                if (data.code !== 0) {
                    console.error(data);
                    util.showModel('语音识别失败', data);
                    return;
                }

                const result = data.data.reduce((pre, cur, idx) => {
                    if (pre.hasError) {
                        return pre;
                    }

                    if (cur.code !== 0) {
                        pre.hasError = true;
                        pre.errMsg = message;
                    }

                    pre.text = cur.text;
                    return pre;
                }, { text: '', hasError: false, errMsg: '' });

                if (!result.hasError) {
                    const notes = this.data.notes.map(v => {
                        if (v.key === key) {
                            v.word = result.text;
                            v.isRec = true;
                        }
                        return v;
                    });

                    this.saveToStorage(notes);
                    this.setData({ notes });
                } else {
                    console.error(result, data);
                    util.showModel('语音识别失败', result.errMsg);
                }
            },
            fail: function (e) {
                console.error(e);
                util.showModel('语音识别失败', e);
            }
        });
    },

    saveToStorage (notes) {
        notes = notes.map(v => {
            delete v.playing;
            return v
        });

        wx.setStorage({
            key: 'notes',
            data: JSON.stringify(notes)
        })
    }
})
