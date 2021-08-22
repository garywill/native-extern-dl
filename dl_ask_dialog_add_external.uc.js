/* Open external downloader directly from Firefox native download asking dialog
 * Add a button to call system command
 * 
 * Show automatically-started download progress
 * 
 * By garywill (https://garywill.github.io)
 * Tested on Firefox 91
 * 
 * Modified from:
 *   https://www.firefox.net.cn/read-121336-2  
 *     18
 */

// ==UserScript==
// @include     chrome://mozapps/content/downloads/unknownContentType.xhtml
// ==/UserScript==

console.log("dl_ask_dialog_add_external.uc.js");
    
(() => {
    let config = {
        extraAppName: "uGet",   // external downloader display name
        extraAppPath: "/usr/bin/uget-gtk",  // path to external downloader executable file // NOTICE
        extraAppParameter: "pw_url",    // command arguments  // TODO cookie, referer ...
    };
    
    const dialogElement = document.documentElement.getButton ?
                            document.documentElement : 
                            document.getElementById('unknownContentType');
    
    
    var downloadModule = {}; // ?
    Components.utils.import("resource://gre/modules/DownloadLastDir.jsm", downloadModule); // ?
    Components.utils.import("resource://gre/modules/Downloads.jsm");
    var MDownloadPlus = {
        showAutoDlInfo: function() {
            let hbox = document.createXULElement("div");
            hbox.style.display = "grid";
            
            let filepath_box = document.createElement("input");
            filepath_box.readOnly = true;
            filepath_box.style.background = "none";
            filepath_box.style.borderWidth = 0;
            filepath_box.style.outline = 0;
            filepath_box.style.margin = 0;
            filepath_box.style.padding = 0;
            
            let info = document.createXULElement("div");
            info.style.display = "block";
            info.style.position = "relative";
            
            let info_text = document.createXULElement("div");
            
            
            var progress = document.createXULElement("div");
            progress.style.width = "1%";
            progress.style.backgroundColor = "#0000ff1c";
            progress.style.position = "absolute";
            progress.style.display = "block";
            progress.style.top = 0;
            progress.style.left = 0;
            progress.textContent = " 　 ";
            
            info.appendChild(info_text);
            info.appendChild(progress);
            hbox.appendChild(filepath_box);
            hbox.appendChild(info);
            
            window.setInterval(function() {
                var targetFile = dialog.mLauncher.targetFile;
                
                var filepath = targetFile.path ? targetFile.path : targetFile.persistentDescriptor;
                var downloaded_size = targetFile.fileSize !== undefined ? targetFile.fileSize : targetFile.fileSizeOfLink;
                var space_avai = targetFile.diskSpaceAvailable;
                
                filepath_box.value = filepath;
                
                var percent = Math.floor(downloaded_size/dialog.mLauncher.contentLength * 100);
                
                info_text.textContent = `${percent} % 　  ${downloaded_size} / ${dialog.mLauncher.contentLength} / ${space_avai}`
                progress.style.width = percent+"%";
                
            }, 300);
            
            dialogElement.appendChild(hbox);
        },
        createExtraAppButton:function () {
            let btn = dialogElement.getButton("extra2");
            if(btn){
                btn.setAttribute("hidden", "false");
                btn.setAttribute("label", config.extraAppName);
                btn.addEventListener("click", function() { 
                    window.MDownloadPlus.lauchExtraApp(); 
                });
            }
        },
        lauchExtraApp:function () {
            let url = dialog.mLauncher.source.spec;
            
            let regEx = new RegExp("^data:");
            if (regEx.test(url)) {
                alert("This link doesn't support external downloader");
                return;
            }
            
            
            let extraApp = Components.classes["@mozilla.org/file/local;1"]
                            .createInstance(Components.interfaces.nsIFile);
            extraApp.initWithPath(config.extraAppPath);
            if (!extraApp.exists()) {
                alert(config.extraAppName+ "Can not find " + config.extraAppPath);
                return;
            }
            
            let commandArgs = config.extraAppParameter.replace("pw_url", url).split(" ");;
            
            let p = Components.classes["@mozilla.org/process/util;1"]
                    .createInstance(Components.interfaces.nsIProcess);
            p.init(extraApp);
            p.run(false, commandArgs, commandArgs.length);
            
            dialog.mDialog.dialog = null;
            window.close();
        },


        setDbClickUrlCopy:function () {
            var element = document.querySelector("#source");
            //element.value = dialog.mSourcePath;
            //element.setAttribute("crop", "center");
            window.setInterval( function() {
                element.setAttribute("tooltiptext", dialog.mLauncher.source.spec); 
            }, 500);
            element.addEventListener("dblclick", function() {
                Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(dialog.mLauncher.source.spec) ;
            });
        },
        init:function () {
            
            this.setDbClickUrlCopy();
            
            this.createExtraAppButton();
            
            this.showAutoDlInfo();
        }
    }
        
    if (location.href.startsWith("chrome://mozapps/content/downloads/unknownContentType.x")) {
        MDownloadPlus.init();
        window.MDownloadPlus = MDownloadPlus;
    }
})()
