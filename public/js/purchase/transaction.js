$(function () {
    if (!isSupportBrowser()) {
        $('.not-recommended').show();
        $('.wrapper-inner').show();
        return;
    }
    var id = getParameter()['id'];
    if (id === undefined) {
        $('.access-error').show();
        $('.wrapper-inner').show();
        return;
    }
    getTransaction(id);
});

/**
 * 取引取得
 * @param {string} id
 * @returns {void}
 */
function getTransaction(id) {
    $.ajax({
        dataType: 'json',
        url: '/purchase/transaction',
        type: 'POST',
        timeout: 10000,
        data: {
            id: id
        },
        beforeSend: function () {
            loadingStart();
        }
    }).done(function (res) {
        if (res.redirect !== null) {
            location.replace(res.redirect);
        } else {
            $('.error').hide();
            $('.' + res.contents).show();
            $('.wrapper-inner').show();
            if (res.contents === 'access-congestion') {
                retry();
            }
            loadingEnd();
        }
    }).fail(function (jqxhr, textStatus, error) {
        $('.error').hide();
        $('.access-congestion').show();
        $('.wrapper-inner').show();
        loadingEnd();
    });
}

/**
 * リトライ
 * @function retry
 * @returns {void}
 */
function retry() {
    var timer = 30000;
    setTimeout(function () {
        getTransaction();
    }, timer);
}

/**
 * ブラウザ対応判定
 * @function isSupportBrowser
 * @returns {boolean}
 */
function isSupportBrowser() {
    var result = true;
    var userAgent = window.navigator.userAgent.toLowerCase();
    var version = window.navigator.appVersion.toLowerCase();
    if (userAgent.indexOf('msie') > -1) {
        if (version.indexOf('msie 6.') > -1) {
            result = false;
        } else if (version.indexOf('msie 7.') > -1) {
            result = false;
        } else if (version.indexOf('msie 8.') > -1) {
            result = false;
        } else if (version.indexOf('msie 9.') > -1) {
            result = false;
        }
    }
    return result;
}