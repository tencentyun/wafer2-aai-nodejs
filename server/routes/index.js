/**
 * ajax 服务路由集合
 */
const router = require('koa-router')({
    prefix: '/weapp'
})
const controllers = require('../controllers')

// 语音识别
router.post('/recognize', controllers.recognize)

module.exports = router
