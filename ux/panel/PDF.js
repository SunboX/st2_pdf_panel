/**
 * Copyright (c) 2012 André Fiedler, <https://twitter.com/sonnenkiste>
 *
 * license: MIT-style license
 */

Ext.define('Ext.ux.panel.PDF', {
    extend: 'Ext.Container',
    xtype : 'pdfpanel',
    alias : 'widget.pdfpanel',
    
    config: {
        
        /**
         * @cfg {String} src
         * URL to the PDF - Same Domain or Server with CORS Support
         */
        src: null,
        
        /**
         * @cfg {ArrayBuffer} data
         * The PDF Data as ByteArray
         */
        data: null,
        
        /**
         * @cfg {String} password
         * Password required to open the PDF.
         */
        password: null,

        /**
         * @cfg{Double} maxPageScale
         * Maximal posible scaling of the PDF if the user zoomes in. 1 = 100%
         */
        maxPageScale: 1.5,
        
        /**
         * @cfg{Double} doubleTapScale
         * Scaling on Double-Tap (Pinch). 1 = maximum Scale (maxPageScale), lager than 1 is more than maxPageScale!
         */
        doubleTapScale: 1,
        
        /**
         * @cfg{Boolean} loadingMask
         * Show or hide the loading Mask.
         */
        loadingMask: true,
        
        /**
         * @cfg{Boolean} resizeOnLoad
         * Resize the PDF to fit into screen after Loading?
         */
        resizeOnLoad: true,
        
        /**
         * @cfg{Boolean} initOnActivate
         * Should we initialize on activate? Otherwise we will init on painted.
         */
        initOnActivate: false,
    
        /**
         * @cfg {Boolean} disableWorker
         * Disable workers to avoid yet another cross-origin issue (workers need the URL of
         * the script to be loaded, and currently do not allow cross-origin scripts)
         */
        disableWorker: true,
        
        /**
         * @cfg {String} loadingMessage
         * The text displayed when loading the PDF.
         */
        loadingMessage: 'Loading PDF, please wait...',
        
        /**
         * @cfg {String} pageText
         * Customizable piece of the default paging text. Note that this string is formatted using
         * {0} and {1} as a token that is replaced by the number of current and total pages. 
         * This token should be preserved when overriding this string if showing the total page count is desired.
         */
        pageText: 'Page {0} of {1}',
        
        /**
         * @cfg{Boolean} hidePagingtoolbar
         * Show or hide the Pagingtoolbar.
         */
        hidePagingtoolbar: false,
        
        /**
         * @cfg {String} ui
         * Style options for Toolbar. Either 'light' or 'dark'.
         * @accessor
         */
        toolbarUi: 'dark',
        
        /**
         * These should not be changed
         */
        scrollable       : 'both',
        extraBaseCls     : Ext.baseCSSPrefix + 'pdf',
        extraContainerCls: Ext.baseCSSPrefix + 'pdf-body'
    },
    
    isLoading: false,
    duringDestroy: false,
    
    constructor: function(config){
        var me = this,
            config = Ext.Object.merge({}, me.config, config),
            pagingItems, userItems = config.items || [];

        me.containerCls = me.containerCls || '';
        me.containerCls += (' ' + me.extraContainerCls);

        me.cls = me.baseCls || '';
        me.cls += (' ' + me.extraBaseCls);
        
        config.html = '<figure><canvas class="pdf-page-container"></canvas></figure>';
        
        if (!config.hidePagingtoolbar) {
            pagingItems = me.getPagingItems();
            userItems.push({
                itemId: 'pagingToolbar',
                xtype : 'titlebar',
                ui    : config.toolbarUi,
                docked: 'bottom',
                title : Ext.String.format(config.pageText, 1, 1),
                items : pagingItems
            });
            config.items = userItems;
        }
        
        me.callParent([config]);
    },
    
    initialize: function() {
        var me = this;
        
        if (me.getInitOnActivate()) {
            me.on('activate', me.initViewer, me, {
                delay: 10, 
                single: true
            });
        } else {
            me.on('painted', me.initViewer, me, {
                delay: 10, 
                single: true
            });
        }
    },

    initViewer: function() {
        var me = this,
            scroller = me.getScrollable().getScroller(),
            element = me.element;

        // disable scroller
        scroller.setDisabled(true);
        
        // config PDF.JS
        PDFJS.disableWorker = !!me.getDisableWorker();

        // mask viewer
        if (me.getLoadingMask()) {
            me.showLoader();
        }

        // retrieve DOM els
        me.figEl = element.down('figure');
        me.canvasEl = me.figEl.down('canvas');

        // apply required styles
        me.figEl.setStyle({
            overflow : 'hidden',
            display : 'block',
            margin : 0
        });

        me.canvasEl.setStyle({
            '-webkit-user-drag' : 'none',
            '-webkit-transform-origin' : '0 0',
            'visibility' : 'hidden'
        });

        // attach event listeners
        me.on({
            load: me.onPdfLoad,
            resize: me.resize,
            scope: me
        });
        me.canvasEl.on({
            doubletap : me.onDoubleTap,
            pinchstart : me.onPagePinchStart,
            pinch : me.onPagePinch,
            pinchend : me.onPagePinchEnd,
            scope : me
        });

        // load the PDF
        me.loadPdf();
    },
    
    setSrc: function(src) {
        var me = this;
        me.config.src = src;
        if(src !== null) {
            me.config.data = null;
        }
        me.loadPdf();
        return me;
    },
    
    getSrc: function() {
        return this.config.src;
    },
    
    setData: function(data) {
        var me = this;
        if(data !== null) {
            me.config.src = null;
        }
        me.config.data = data;
        me.loadPdf();
        return me;
    },
    
    getData: function() {
        return this.config.data;
    },
    
    getPagingItems: function() {
        var me = this;

        return [{
            itemId: 'prev',
            iconCls: 'arrow_left',
            iconMask: true,
            align: 'left',
            disabled: true,
            handler: me.movePrevious,
            scope: me
        },
        {
            itemId: 'next',
            iconCls: 'arrow_right',
            iconMask: true,
            align: 'right',
            disabled: true,
            handler: me.moveNext,
            scope: me
        }];
    },
    
    showLoader: function() {
        var me = this;
        me.setMasked({
            xtype : 'loadmask',
            message : me.getLoadingMessage()
        });
        return me;
    },
    
    hideLoader: function() {
        var me = this;
        me.setMasked(false);
        return me;
    },

    loadPdf: function(src, data, password) {
        var me = this;
        
        src = src || me.getSrc();
        data = data || me.getData();
        password = password || me.getPassword();
        
        if ((!src && !data) || me.isLoading) {
            return me;
        }
            
        var params = { password: password };
            
        if (me.canvasEl) {
        
            me.isLoading = true;
            
            if (typeof src === 'string') { // URL
                params.url = src;
            } else if (data && 'byteLength' in data) { // ArrayBuffer
                params.data = data;
            }
            
            // Asynchronously download PDF as an ArrayBuffer
            PDFJS.getDocument(params).then(function(pdfDoc) {
                me.pdfDoc = pdfDoc;
                me.onLoad();
            });
        }
        
        return me;
    },
    
    onLoad: function(el, e){
        var me = this, isEmpty;
        
        isEmpty = me.pdfDoc.numPages === 0;
        me.currentPage = me.currentPage || (isEmpty ? 0 : 1);
        
        me.renderPage(me.currentPage, function(){
            me.isLoading = false;
            me.fireEvent('load', me, el, e);
        });
    },

    renderPage: function(num, callback) {
        var me = this,
            toolbar, isEmpty, pageCount,
            currPage, pageText;

        if(me.isRendering) return;

        me.isRendering = true;
        me.currentPage = num;

        currPage = me.currentPage;
        pageCount = me.pdfDoc.numPages;
        pageText = Ext.String.format(me.getPageText(), isNaN(currPage) ? 1 : currPage, isNaN(pageCount) ? 1 : pageCount);
        isEmpty = pageCount === 0;
        
        // Suspend Layouts while we ccaching multiple items of the container
        // Restore suspended layout configuration
        var layoutWasSuspended = me.suspendLayout;
        me.suspendLayout = true;
        
        if (!me.getHidePagingtoolbar()) {
            toolbar = me.child('#pagingToolbar');
            toolbar.setTitle(pageText);
            toolbar.leftBox.child('#prev').setDisabled(currPage === 1 || isEmpty);
            toolbar.rightBox.child('#next').setDisabled(currPage === pageCount || isEmpty);
        }
        
        // Using promise to fetch the page
        me.pdfDoc.getPage(num).then(function(page) {
            var viewport = page.getViewport(me.getMaxPageScale());
            me.canvasEl.dom.height = viewport.height;
            me.canvasEl.dom.width = viewport.width;

            var ctx = me.canvasEl.dom.getContext('2d');
            ctx.save();
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillRect(0, 0, me.canvasEl.dom.width, me.canvasEl.dom.height);
            ctx.restore();

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            page.render(renderContext);

            me.suspendLayout = layoutWasSuspended;

            me.isRendering = false;
            
            Ext.callback(callback, me);
            
            if(me.rendered) {
                me.fireEvent('change', me, {
                    current: me.currentPage,
                    total: me.pdfDoc.numPages
                });
            }
        });
    },

    onPdfLoad : function() {
        var me = this,
            parentElement = me.parent.element;

        // get viewport size
        me.viewportWidth = me.viewportWidth || me.element.getWidth() || parentElement.getWidth();
        me.viewportHeight = me.viewportHeight || (function(){
            var h = me.element.getHeight() || parentElement.getHeight(),
                docked = me.getDockedItems(),
                i, len;
            for(i = 0, len = docked.length; i < len; i++){
                h -= docked[i].element.getHeight();
            }
            return h;
        })();

        // grab page size
        me.canvasWidth = me.canvasEl.dom.width;
        me.canvasHeight = me.canvasEl.dom.height;

        // calculate and apply initial scale to fit page to screen
        if (me.getResizeOnLoad()) {
            me.scale = me.baseScale = Math.min(me.viewportWidth / me.canvasWidth, me.viewportHeight / me.canvasHeight);
        } else {
            me.scale = me.baseScale = 1;
        }

        // calc initial translation
        var tmpTranslateX = (me.viewportWidth - me.baseScale * me.canvasWidth) / 2,
            tmpTranslateY = (me.viewportHeight - me.baseScale * me.canvasHeight) / 2;
        
        // set initial translation to center
        me.setTranslation(tmpTranslateX, tmpTranslateY);
        me.translateBaseX = me.translateX;
        me.translateBaseY = me.translateY;

        // apply initial scale and translation
        me.applyTransform();

        // initialize scroller configuration
        me.adjustScroller();

        // show page and remove mask
        me.canvasEl.setStyle({
            visibility : 'visible'
        });

        if (me.getLoadingMask()) {
            me.hideLoader();
        }

        me.fireEvent('pdfLoaded', me);
    },

    onPagePinchStart: function(ev) {
        var me = this,
            scroller = me.getScrollable().getScroller(),
            scrollPosition = scroller.position,
            touches = ev.touches,
            element = me.element,
            scale = me.scale;

        // disable scrolling during pinch
        scroller.stopAnimation();
        scroller.setDisabled(true);

        // store beginning scale
        me.startScale = scale;

        // calculate touch midpoint relative to page viewport
        me.originViewportX = (touches[0].pageX + touches[1].pageX) / 2 - element.getX();
        me.originViewportY = (touches[0].pageY + touches[1].pageY) / 2 - element.getY();

        // translate viewport origin to position on scaled page
        me.originScaledCanvasX = me.originViewportX + scrollPosition.x - me.translateX;
        me.originScaledCanvasY = me.originViewportY + scrollPosition.y - me.translateY;

        // unscale to find origin on full size page
        me.originFullCanvasX = me.originScaledCanvasX / scale;
        me.originFullCanvasY = me.originScaledCanvasY / scale;

        // calculate translation needed to counteract new origin and keep page in same position on screen
        me.translateX += (-1 * ((me.canvasWidth * (1 - scale)) * (me.originFullCanvasX / me.canvasWidth)));
        me.translateY += (-1 * ((me.canvasHeight * (1 - scale)) * (me.originFullCanvasY / me.canvasHeight)));

        // apply new origin
        me.setOrigin(me.originFullCanvasX, me.originFullCanvasY);

        // apply translate and scale CSS
        me.applyTransform();
    },

    onPagePinch: function(ev) {
        var me = this;
        
        // prevent scaling to smaller than screen size
        me.scale = Ext.Number.constrain(ev.scale * me.startScale, me.baseScale - 2, me.getMaxPageScale());
        me.applyTransform();
    },

    onPagePinchEnd : function(ev) {
        var me = this;

        // set new translation
        if (me.scale == me.baseScale) {
            // move to center
            me.setTranslation(me.translateBaseX, me.translateBaseY);
        } else {
            //Resize to init size like ios
            if (me.scale < me.baseScale && me.getResizeOnLoad()) {
                me.resetZoom();
                return;
            }
            // calculate rescaled origin
            me.originReScaledCanvasX = me.originScaledCanvasX * (me.scale / me.startScale);
            me.originReScaledCanvasY = me.originScaledCanvasY * (me.scale / me.startScale);

            // maintain zoom position
            me.setTranslation(me.originViewportX - me.originReScaledCanvasX, me.originViewportY - me.originReScaledCanvasY);
        }
        // reset origin and update transform with new translation
        me.setOrigin(0, 0);
        me.applyTransform();

        // adjust scroll container
        me.adjustScroller();
    },

    onZoomIn: function() {
        var me = this,
            ev = {
                pageX: 0,
                pageY: 0
            },
            myScale = me.scale;
            
        if (myScale < me.getMaxPageScale()) {
            myScale = me.scale + 0.05;
        }
        
        if (myScale >= me.getMaxPageScale()) {
            myScale = me.getMaxPageScale();
        }

        ev.pageX = me.viewportWidth / 2;
        ev.pageY = me.viewportHeight / 2;
        
        me.zoomPage(ev, myScale);
    },

    onZoomOut: function() {
        var me = this,
            ev = {
                pageX: 0,
                pageY: 0
            },
            myScale = me.scale;
            
        if (myScale > me.baseScale) {
            myScale = me.scale - 0.05;
        }
        
        if (myScale <= me.baseScale) {
            myScale = me.baseScale;
        }

        ev.pageX = me.viewportWidth / 2;
        ev.pageY = me.viewportHeight / 2;
        
        me.zoomPage(ev, myScale);
    },

    zoomPage: function(ev, scale, scope) {
        var me = this,
            scroller = me.getScrollable().getScroller(),
            scrollPosition = scroller.position,
            element = me.element;

        // zoom in toward tap position
        var oldScale = me.scale,
            newScale = scale,
            originViewportX = ev ? (ev.pageX - element.getX()) : 0,
            originViewportY = ev ? (ev.pageY - element.getY()) : 0,
            originScaledCanvasX = originViewportX + scrollPosition.x - me.translateX,
            originScaledCanvasY = originViewportY + scrollPosition.y - me.translateY,
            originReScaledCanvasX = originScaledCanvasX * (newScale / oldScale),
            originReScaledCanvasY = originScaledCanvasY * (newScale / oldScale);

        me.scale = newScale;
        setTimeout(function() {
            me.setTranslation(originViewportX - originReScaledCanvasX, originViewportY - originReScaledCanvasY);
            // reset origin and update transform with new translation
            //that.setOrigin(0, 0);

            // reset origin and update transform with new translation
            me.applyTransform();

            // adjust scroll container
            me.adjustScroller();

            // force repaint to solve occasional iOS rendering delay
            Ext.repaint();
        }, 50);
    },

    onDoubleTap: function(ev, t) {
        var me = this,
            scroller = me.getScrollable().getScroller(),
            scrollPosition = scroller.position,
            element = me.element;

        if (!me.getDoubleTapScale()){
            return false;
        }

        // set scale and translation
        if (me.scale > me.baseScale) {
            // zoom out to base view
            me.scale = me.baseScale;
            me.setTranslation(me.translateBaseX, me.translateBaseY);
            // reset origin and update transform with new translation
            me.applyTransform();

            // adjust scroll container
            me.adjustScroller();

            // force repaint to solve occasional iOS rendering delay
            Ext.repaint();
        } else {
            // zoom in toward tap position
            var oldScale = me.scale,
                newScale = me.baseScale * 4,

                originViewportX = ev ? (ev.pageX - element.getX()) : 0,
                originViewportY = ev ? (ev.pageY - element.getY()) : 0,

                originScaledCanvasX = originViewportX + scrollPosition.x - me.translateX,
                originScaledCanvasY = originViewportY + scrollPosition.y - me.translateY,

                originReScaledCanvasX = originScaledCanvasX * (newScale / oldScale),
                originReScaledCanvasY = originScaledCanvasY * (newScale / oldScale);

            me.scale = newScale;

            //smoothes the transition
            setTimeout(function() {
                me.setTranslation(originViewportX - originReScaledCanvasX, originViewportY - originReScaledCanvasY);
                // reset origin and update transform with new translation
                me.applyTransform();

                // adjust scroll container
                me.adjustScroller();

                // force repaint to solve occasional iOS rendering delay
                Ext.repaint();
            }, 50);
        }
    },

    setOrigin: function(x, y) {
        this.canvasEl.dom.style.webkitTransformOrigin = x + 'px ' + y + 'px';
    },

    setTranslation: function(translateX, translateY) {
        var me = this;
        
        me.translateX = translateX;
        me.translateY = translateY;

        // transfer negative translations to scroll offset
        me.scrollX = me.scrollY = 0;

        if (me.translateX < 0) {
            me.scrollX = me.translateX;
            me.translateX = 0;
        }
        if (me.translateY < 0) {
            me.scrollY = me.translateY;
            me.translateY = 0;
        }
    },

    resetZoom: function() {
        var me = this;
        
        if (me.duringDestroy) {
            return;
        }
        
        // resize to init size like ios
        me.scale = me.baseScale;

        me.setTranslation(me.translateBaseX, me.translateBaseY);

        // reset origin and update transform with new translation
        me.setOrigin(0, 0);
        me.applyTransform();

        // adjust scroll container
        me.adjustScroller();
    },
    
    resize: function() {
        var me = this,
            parentElement = me.parent;
        
        // get viewport size
        me.viewportWidth = me.element.getWidth() || parentElement.getWidth();
        me.viewportHeight = (function(){
            var h = me.element.getHeight() || parentElement.getHeight(),
                docked = me.getDockedItems(),
                i, len;
            for(i = 0, len = docked.length; i < len; i++){
                h -= docked[i].element.getHeight();
            }
            return h;
        })();

        // grab page size
        me.canvasWidth = me.canvasEl.dom.width;
        me.canvasHeight = me.canvasEl.dom.height;

        // calculate and apply initial scale to fit page to screen
        if (me.getResizeOnLoad()) {
            me.scale = me.baseScale = Math.min(me.viewportWidth / me.canvasWidth, me.viewportHeight / me.canvasHeight);
        } else {
            me.scale = me.baseScale = 1;
        }

        // set initial translation to center
        me.translateX = me.translateBaseX = (me.viewportWidth - me.baseScale * me.canvasWidth) / 2;
        me.translateY = me.translateBaseY = (me.viewportHeight - me.baseScale * me.canvasHeight) / 2;

        // apply initial scale and translation
        me.applyTransform();

        // initialize scroller configuration
        me.adjustScroller();
    },

    applyTransform: function() {
        var me = this,
            fixedX = Ext.Number.toFixed(me.translateX, 5),
            fixedY = Ext.Number.toFixed(me.translateY, 5),
            fixedScale = Ext.Number.toFixed(me.scale, 8);

        if (Ext.os.is.Android) {
            me.canvasEl.dom.style.webkitTransform =
            //'translate('+fixedX+'px, '+fixedY+'px)'
            //+' scale('+fixedScale+','+fixedScale+')';
            'matrix(' + fixedScale + ',0,0,' + fixedScale + ',' + fixedX + ',' + fixedY + ')';
        } else {
            me.canvasEl.dom.style.webkitTransform = 'translate3d(' + fixedX + 'px, ' + fixedY + 'px, 0)' + ' scale3d(' + fixedScale + ',' + fixedScale + ',1)';
        }
    },

    adjustScroller: function() {
        var me = this,
            scroller = me.getScrollable().getScroller(),
            scale = me.scale;

        // disable scrolling if zoomed out completely, else enable it
        if (scale == me.baseScale) {
            scroller.setDisabled(true);
        } else {
            scroller.setDisabled(false);
        }

        // size container to final page size
        var boundWidth = Math.max(me.canvasWidth * scale + 2 * me.translateX, me.viewportWidth);
        var boundHeight = Math.max(me.canvasHeight * scale + 2 * me.translateY, me.viewportHeight);

        me.figEl.setStyle({
            width : boundWidth + 'px',
            height: boundHeight + 'px'
        });

        // update scroller to new content size
        scroller.refresh();

        // apply scroll
        var x = 0;
        if (me.scrollX) {
            x = me.scrollX;
        }
        
        var y = 0;
        if (me.scrollY) {
            y = me.scrollY;
        }
        
        scroller.scrollTo(x * -1, y * -1);
    },

    movePrevious: function(){
        var me = this,
            prev = me.currentPage - 1;

        if(prev > 0) {
            if(me.fireEvent('beforechange', me, prev) !== false) {
                me.renderPage(prev);
            }
        }
    },

    moveNext: function(){
        var me = this,
            total = me.pdfDoc.numPages,
            next = me.currentPage + 1;

        if(next <= total) {
            if(me.fireEvent('beforechange', me, next) !== false) {
                me.renderPage(next);
            }
        }
    },
    
    destroy: function() {
        var me = this;
        
        me.duringDestroy = true;
        
        me.un({
            activate: me.initViewer,
            painted: me.initViewer,
            load: me.onPdfLoad,
            resize: me.resize,
            scope: me
        });
        me.canvasEl.un({
            doubletap : me.onDoubleTap,
            pinchstart : me.onPagePinchStart,
            pinch : me.onPagePinch,
            pinchend : me.onPagePinchEnd,
            scope : me
        });
        
        Ext.destroy(me.getScrollable(), me.figEl, me.canvasEl);
        
        me.callParent();
    }
});