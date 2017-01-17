"use strict";
(function () {
    var ScreenSeatStatusesMap = function (target) {
        this.screen = target;
        this.scale = 0;
        this.permission = true;
        this.init();
        this.setEvent();
    }
    
    ScreenSeatStatusesMap.prototype = {
        //初期化
        init: function () {
            this.state = ScreenSeatStatusesMap.STATE_DEFAULT;
            this.scaleDown();
        },
        //イベント登録
        setEvent: function () {
            var _this = this;
            this.screen.on('click', '.screen-inner', function(event) {
                event.preventDefault();
                if (!_this.permission) return;
                if (!_this.isZoom() && $('.screen .device-type-sp').is(':visible')) {
                    var scroll = _this.screen.find('.screen-scroll');
                    
                    var pos = {
                        x: event.pageX - scroll.offset().left,
                        y: event.pageY - scroll.offset().top
                    };            
                      
                    var scrollPos = {
                        x: pos.x / _this.scale - _this.screen.width() / 2,
                        y: pos.y / _this.scale - _this.screen.height() / 2,
                    }
                    
                    _this.scaleUp();
                    scroll.scrollLeft(scrollPos.x);
                    scroll.scrollTop(scrollPos.y);
                    
                }
            });
            $(window).on('resize', function() {
                _this.init();
            });
        },
        //拡大
        scaleUp: function () {
            var scroll = this.screen.find('.screen-scroll');
            var inner = this.screen.find('.screen-inner');
            this.state = ScreenSeatStatusesMap.STATE_ZOOM;
            this.screen.addClass('zoom');
            this.scale = 1;
            scroll.css({
                transformOrigin: '50% 50%',
                transform:'scale('+ this.scale +')'
            });
        },
        //縮小
        scaleDown: function () {
            var scroll = this.screen.find('.screen-scroll');
            var inner = this.screen.find('.screen-inner');
            this.state = ScreenSeatStatusesMap.STATE_DEFAULT;
            this.screen.removeClass('zoom');
            this.scale = this.screen.width() / inner.width();
            scroll.height(inner.height() * this.scale);
            scroll.css({
                transformOrigin: '0 0',
                transform:'scale('+ this.scale +')'
            });
        },
        //拡大判定
        isZoom: function() {
            var result = false;
            if (this.state === ScreenSeatStatusesMap.STATE_ZOOM) result = true;
            return result;
        },
        //拡大許可
        setPermission: function(value) {
            this.permission = value;
        }
    };
    
    ScreenSeatStatusesMap.STATE_DEFAULT = 0;
    ScreenSeatStatusesMap.STATE_ZOOM = 1;
    SASAKI = SASAKI || {};
    SASAKI.ScreenSeatStatusesMap = ScreenSeatStatusesMap;
}());
