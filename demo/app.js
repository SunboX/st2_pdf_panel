Ext.Loader.setConfig({
    enabled: true,
    paths: {
        'Ext.ux': '../ux'
    }
});

Ext.application({

    name  : 'PDF Panel Demo',
    views : [
        'Ext.ux.panel.PDF'
    ],
    launch: function() {
        
        Ext.Viewport.add({
            xtype     : 'pdfpanel',
            fullscreen: true,
            layout    : 'fit',
            style     : {
                backgroundColor: '#333'
            },
            pageScale : 0.5,                                            // Initial scaling of the PDF. 1 = 100%
            src       : 'http://cdn.mozilla.net/pdfjs/tracemonkey.pdf', // URL to the PDF - Same Domain or Server with CORS Support
        });
    }
});
