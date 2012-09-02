Ext.Loader.setConfig({
    enabled: true,
    paths: {
        'Ext.ux': '../../ux'
    }
});

Ext.application({

    name  : 'Loading from local Filesystem Demo',
    views : [
        'Ext.ux.panel.PDF'
    ],
    launch: function() {
        
        // Local file
        var localFile = 'resources/tracemonkey.pdf';
        
        var viewer = Ext.crete('Ext.ux.panel.PDF', {
            fullscreen: true,
            layout    : 'fit',
            style     : {
                backgroundColor: '#333'
            }
        });
        
        Ext.Viewport.add(viewer);
        
        // Read the local file into a Uint8Array.
        var fileReader = new FileReader();
        fileReader.onload = function(evt) {
            var base64String = evt.target.result;
            var byteArray = Base64Binary.decodeArrayBuffer(base64String);  
            viewer.setData(byteArray);
        };
        
        // This uses PhoneGap/Cordova FileReader API
        // @see http://docs.phonegap.com/en/2.0.0/cordova_file_file.md.html#FileReader
        fileReader.readAsDataURL(localFile);
    }
});
