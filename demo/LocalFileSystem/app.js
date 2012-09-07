/**
 * This will only work with PhoneGap/Cordova greater or equal 2.1.0 !
 * @see https://issues.apache.org/jira/browse/CB-1380
 */
Ext.application({

    name: 'Loading from local FileSystem Demo',
    views: [
        'Ext.ux.panel.PDF'
    ],
    launch: function() {

        // Local file
        // For the right path, see http://stackoverflow.com/questions/4548561/filereader-returns-empty-result-for-file-from-the-bundle
        var localFile = './../myApp.app/www/resources/tracemonkey.pdf';

        var viewer = Ext.create('Ext.ux.panel.PDF', {
            fullscreen: true,
            layout: 'fit',
            style: {
                backgroundColor: '#333'
            }
        });

        Ext.Viewport.add([
            {
                xtype: 'toolbar',
                docked: 'top',
                title: 'PDF Viewer'
            },
            viewer
        ]);

        function gotFileSystem(fileSystem) {
            fileSystem.root.getFile(localFile, null, gotFileEntry, fail);
        }

        function gotFileEntry(fileEntry) {
            fileEntry.file(readDataUrl, fail);
        }

        function readDataUrl(file) {
            
            // Read the local file into a Uint8Array.
            var reader = new FileReader();
            reader.onloadend = function(evt) {
                console.log('Read as data URL');
                var base64String = evt.target.result;
                // replace data:application/pdf;base64,
                base64String = base64String.substring(28);
                var byteArray = Base64Binary.decodeArrayBuffer(base64String);
                viewer.setData(byteArray);
            };
            
            // This uses PhoneGap/Cordova FileReader API
            // @see http://docs.phonegap.com/en/2.0.0/cordova_file_file.md.html#FileReader
            reader.readAsDataURL(file);
        }

        function fail(error) {
            console.log('File Error:');
            switch (error.code) {
                case FileError.NOT_FOUND_ERR:
                    console.log('NOT_FOUND_ERR');
                    break;
                case FileError.SECURITY_ERR:
                    console.log('SECURITY_ERR');
                    break;
                case FileError.ABORT_ERR:
                    console.log('ABORT_ERR');
                    break;
                case FileError.NOT_READABLE_ERR:
                    console.log('NOT_READABLE_ERR');
                    break;
                case FileError.ENCODING_ERR:
                    console.log('ENCODING_ERR');
                    break;
                case FileError.NO_MODIFICATION_ALLOWED_ERR:
                    console.log('NO_MODIFICATION_ALLOWED_ERR');
                    break;
                case FileError.INVALID_STATE_ERR:
                    console.log('INVALID_STATE_ERR');
                    break;
                case FileError.SYNSYNTAX_ERRTAX_ERR:
                    console.log('SYNSYNTAX_ERRTAX_ERR');
                    break;
                case FileError.INVALID_MODIFICATION_ERR:
                    console.log('INVALID_MODIFICATION_ERR');
                    break;
                case FileError.QUOTA_EXCEEDED_ERR:
                    console.log('QUOTA_EXCEEDED_ERR');
                    break;
                case FileError.TYPE_MISMATCH_ERR:
                    console.log('TYPE_MISMATCH_ERR');
                    break;
                case FileError.PATH_EXISTS_ERR:
                    console.log('PATH_EXISTS_ERR');
                    break;
            }
        }

        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFileSystem, fail);
    }
});