/**
 * Copyright (c) 2012 André Fiedler, <https://twitter.com/sonnenkiste>
 *
 * license: MIT-style license
 */

Ext.define('Ext.ux.panel.PDF', {
    extend: 'Ext.Container',

    alias: 'widget.pdfpanel',

    config: {
        /**
         * @cfg {String} src
         * URL to the PDF - Same Domain or Server with CORS Support
         */
        src: '',
    
        /**
         * @cfg {Double} pageScale
         * Initial scaling of the PDF. 1 = 100%
         */
        pageScale: 1,
    
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
         * @cfg {String} ui
         * Style options for Toolbar. Either 'light' or 'dark'.
         * @accessor
         */
        toolbarUi: 'dark',
        
        extraBaseCls     : Ext.baseCSSPrefix + 'pdf',
        extraContainerCls: Ext.baseCSSPrefix + 'pdf-body',
        /*
        scrollable: {
            direction: 'both'
        }
        */
    },
    
    getPagingItems: function(){
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

    constructor: function(config){
        var me = this,
            pagingItems = me.getPagingItems(),
            config = Ext.Object.merge({}, me.config, config),
            userItems = config.items || [];

        me.containerCls = me.containerCls || '';
        me.containerCls += (' ' + me.extraContainerCls);

        me.cls = me.baseCls || '';
        me.cls += (' ' + me.extraBaseCls);
        
        userItems.push({
            xtype: 'container',
            html: '<canvas class="pdf-page-container"></canvas>',
            listeners: {
                painted: function(){
                    me.pageContainer = this.innerElement.query('.pdf-page-container')[0];
                    me.pageContainer.mozOpaque = true;
                }
            }
        });
        userItems.push({
            itemId: 'pagingToolbar',
            xtype : 'titlebar',
            ui    : config.toolbarUi,
            docked: 'bottom',
            title : Ext.String.format(config.pageText, 1, 1),
            items : pagingItems
        });
        config.items = userItems;
        
        me.callParent([config]);

        /*
        me.on('afterrender', function(){
            me.loader = new Ext.LoadMask(me.child('#pdfPageContainer'), {
                msg: me.loadingMessage
            });
            me.loader.show();
        }, me, {
            single: true
        });
        */
        
        PDFJS.disableWorker = !!me.getDisableWorker();

        // Asynchronously download PDF as an ArrayBuffer
        PDFJS.getDocument(me.getSrc()).then(function (pdfDoc) {
            me.pdfDoc = pdfDoc;
            me.onLoad();
        });
    },

    onLoad: function(){
        var me = this, isEmpty;
        
        isEmpty = me.pdfDoc.numPages === 0;
        me.currentPage = me.currentPage || (isEmpty ? 0 : 1);

        me.renderPage(me.currentPage);
    },

    renderPage: function (num) {
        var me = this,
            toolbar = me.child('#pagingToolbar'),
            isEmpty, pageCount,
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
        
        toolbar.setTitle(pageText);
        toolbar.leftBox.child('#prev').setDisabled(currPage === 1 || isEmpty);
        toolbar.rightBox.child('#next').setDisabled(currPage === pageCount || isEmpty);
        
        // Using promise to fetch the page
        me.pdfDoc.getPage(num).then(function (page) {
            var viewport = page.getViewport(me.getPageScale());
            me.pageContainer.height = viewport.height;
            me.pageContainer.width = viewport.width;

            var ctx = me.pageContainer.getContext('2d');
            ctx.save();
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillRect(0, 0, me.pageContainer.width, me.pageContainer.height);
            ctx.restore();

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            page.render(renderContext);

            me.suspendLayout = layoutWasSuspended;

            me.isRendering = false;

            /*
            if(me.loader) {
                me.loader.destroy();
            }
            */
            
            if(me.rendered) {
                me.fireEvent('change', me, {
                    current: me.currentPage,
                    total: me.pdfDoc.numPages
                });
            }
        });
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
    }
});