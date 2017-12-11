/**
 * Full-Date formater
 * @author jasonelchen
 * @param date   时间
 * @param format 格式
  */
module.exports = function dateformat (date, format) {
    const o = {
        /**
         * 完整年份
         * @example 2015 2016 2017 2018
         */
        YYYY () {
            return date.getFullYear().toString();
        },

        /**
         * 年份后两位
         * @example 15 16 17 18
         */
        YY() {
            return this.YYYY().slice(-2);
        },

        /**
         * 月份，保持两位数
         * @example 01 02 03 .... 11 12
         */
        MM() {
            return leftPad(this.M(), 2);
        },

        /**
         * 月份
         * @example 1 2 3 .... 11 12
         */
        M() {
            return (date.getMonth() + 1).toString();
        },

        /**
         * 每月中的日期，保持两位数
         * @example 01 02 03 .... 30 31
         */
        DD() {
            return leftPad(this.D(), 2);
        },

        /**
         * 每月中的日期
         * @example 1 2 3 .... 30 31
         */
        D() {
            return date.getDate().toString();
        },

        /**
         * 小时，24 小时制，保持两位数
         * @example 00 01 02 .... 22 23
         */
        HH() {
            return leftPad(this.H(), 2);
        },

        /**
         * 小时，24 小时制
         * @example 0 1 2 .... 22 23
         */
        H() {
            return date.getHours().toString();
        },

        /**
         * 小时，12 小时制，保持两位数
         * @example 00 01 02 .... 22 23
         */
        hh() {
            return leftPad(this.h(), 2);
        },

        /**
         * 小时，12 小时制
         * @example 0 1 2 .... 22 23
         */
        h() {
            const h = (date.getHours() % 12).toString();
            return h === '0' ? '12' : h;
        },

        /**
         * 分钟，保持两位数
         * @example 00 01 02 .... 59 60
         */
        mm() {
            return leftPad(this.m(), 2);
        },

        /**
         * 分钟
         * @example 0 1 2 .... 59 60
         */
        m() {
            return date.getMinutes().toString();
        },

        /**
         * 秒，保持两位数
         * @example 00 01 02 .... 59 60
         */
        ss() {
            return leftPad(this.s(), 2);
        },

        /**
         * 秒
         * @example 0 1 2 .... 59 60
         */
        s() {
            return date.getSeconds().toString();
        }
    };

    return Object.keys(o).reduce((pre, cur) => {
        return pre.replace(new RegExp(cur), match => {
            return o[match].call(o);
        });
    }, format);
}

function leftPad(num, width, c = '0') {
    const numStr = num.toString();
    const padWidth = width - numStr.length;
    return padWidth > 0 ? new Array(padWidth + 1).join(c) + numStr : numStr;
}
