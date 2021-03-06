const request = require('request');
const getImageInfo = require('../lib/getImageInfo');
const messageHelper = require('../lib/messageHelper');

module.exports = async function (recvObj, isPending = false) {
    const imageUrl = messageHelper.getImage(recvObj.message);
    if (isPending) {
        const imgInfo = await getImageInfo(imageUrl);
        if (!imgInfo) {
            sendText(recvObj, '欧尼酱搜图的话请至少要一张图哦~');
        } else {
            SauceNAO(imgInfo.url, recvObj);
        }
        appEvent.emit('SauceNao_done', recvObj);
        return;
    }
    const inputText = messageHelper.getText(recvObj.message).trim();
    if (/((搜|查|找).*?图)|(图.*?(搜|查|找))/.test(inputText)) {
        const imgInfo = await getImageInfo(imageUrl);
        if (!imgInfo) {
            sendText(recvObj, '收到！接下来请单独发一张图片给我搜索~');
            appEvent.emit('SauceNao_pending', recvObj);
        } else {
            SauceNAO(imgInfo.url, recvObj);
        }
        return true;
    }
    return false;
}

async function SauceNAO(url, recvObj) {
    sendText(recvObj, '搜索中~');

    let result;
    try {
        result = await new Promise((resolve, reject) => {
            request.post(`${secret.serviceRootUrl}/service/SauceNAO`, {
                json: {
                    url
                }
            }, (err, res, body) => {
                if (err) {
                    reject();
                    return;
                }
                resolve(body);
            });
        });

        if (result.err) {
            switch (result.err) {
                case 'neterr':
                    sendText(recvObj, '欧尼酱搜索出错了~喵');
                    return;
                case 'nofind':
                    sendText(recvObj, '欧尼酱对不起，没有找到你要的~');
                    return;
            }
        }
    } catch {
        sendText(recvObj, '欧尼酱搜索出错了~喵');
        return;
    }

    const message = [{
            type: 'At',
            target: recvObj.qq
        },
        {
            type: 'Plain',
            text: ' 欧尼酱是不是你想要的内个~'
        },
        {
            type: 'Plain',
            text: `\n相似度：${result.saucenaoObj.header.similarity}%`
        }
    ];
    if (result.saucenaoObj.data.title ||
        result.saucenaoObj.data.jp_name ||
        result.saucenaoObj.data.eng_name) {
        message.push({
            type: 'Plain',
            text: '\n标题：' +
                result.saucenaoObj.data.title ||
                result.saucenaoObj.data.jp_name ||
                result.saucenaoObj.data.eng_name
        });
    }
    if (result.saucenaoObj.data.member_name ||
        result.saucenaoObj.data.author_name ||
        result.saucenaoObj.data.creator) {
        message.push({
            type: 'Plain',
            text: '\n作者：' +
                result.saucenaoObj.data.member_name ||
                result.saucenaoObj.data.author_name ||
                result.saucenaoObj.data.creator
        });
    }
    if (result.imageUrl) {
        message.push({
            type: 'Plain',
            text: '\n'
        }, {
            type: 'Image',
            url: result.imageUrl
        });
    }
    if (result.saucenaoObj.data.ext_urls) {
        message.push({
            type: 'Plain',
            text: '\n' + result.saucenaoObj.data.ext_urls[0]
        });
    }
    sendMsg(recvObj, message);
}