/* Open external downloader directly from Firefox native download asking dialog
 * Add a button to call system command
 * 
 * Show automatically-started download progress
 * 
 * By garywill (https://garywill.github.io)
 * Tested on Firefox 140
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
        // extraAppPath: "/usr/bin/xmessage",
    };
    
    function extraAppParamsArrGenerator(app, dlurl, useragent, referer, cookie, postdata, proxy) {
        // dlurl useragent  referer  cookie  postdata : string
        // proxy : bool
        let result_arr = [];

        if (app == 'uget')
        {
            if (useragent)
                result_arr = result_arr.concat([`--http-user-agent=${useragent}`]);

            if (referer)
                result_arr = result_arr.concat([`--http-referer=${referer}`]);

            if (cookie)
                result_arr = result_arr.concat([`--http-cookie-data=${cookie}`]);

            if (proxy)
            {
            }

            if (postdata)
                result_arr = result_arr.concat([`--http-post-data=${postdata}`]);

            result_arr = result_arr.concat([dlurl]);
        }
        return result_arr;
    }

    const dialogElement = document.documentElement.getButton ?
                            document.documentElement : 
                            document.getElementById('unknownContentType');
    
    
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
            filepath_box.style.whiteSpace = "nowrap";
            filepath_box.style.fontSize = "7px";
            
            let info = document.createXULElement("div");
            info.style.display = "block";
            info.style.position = "relative";
            info.style.fontSize = "10px";
            
            let info_text = document.createXULElement("div");
            info_text.style.whiteSpace = "nowrap";
            
            
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
                var networkFile_size = dialog.mLauncher.contentLength; 
                var space_avai = targetFile.diskSpaceAvailable;
                
                filepath_box.value = filepath;
                
                var percent; 
                var disp_networkFile_size ;
                if (networkFile_size > 0)
                {
                    disp_networkFile_size = memoryAddUnit(networkFile_size);
                    percent = Math.floor(downloaded_size/dialog.mLauncher.contentLength * 100);
                    progress.style.width = percent+"%";
                }else {
                    disp_networkFile_size = '?'; 
                    percent = '?'; 
                }
                
                info_text.textContent = `${percent}% ${memoryAddUnit(downloaded_size)} / ${disp_networkFile_size}  (${convertToSuperscript(downloaded_size)} / ${convertToSuperscript(dialog.mLauncher.contentLength)}) Space: ${memoryAddUnit(space_avai)}`
                
            }, 300);
            
            dialogElement.appendChild(hbox);
        },
        createExtraAppButton:function () {
            let btn = dialogElement.getButton("extra2");
            if(btn){
                btn.setAttribute("label", config.extraAppName);
                btn.addEventListener("click", function() { 
                    var r = window.MDownloadPlus.lauchExtraApp(); 
                    if (r)
                        dialogElement.getButton("cancel").click();
                    else
                        alert("Something was wrong when tried to launch extra doenload app");
                });
                btn.setAttribute("hidden", "false");
            }
        },
        lauchExtraApp:function () {
            let url = dialog.mLauncher.source.spec;
            
            let regEx = new RegExp("^data:");
            if (regEx.test(url)) {
                alert("This link doesn't support external downloader");
                return false;
            }
            
            
            let extraApp = Components.classes["@mozilla.org/file/local;1"]
                            .createInstance(Components.interfaces.nsIFile);
            extraApp.initWithPath(config.extraAppPath);
            if (!extraApp.exists()) {
                alert(config.extraAppName+ "Can not find " + config.extraAppPath);
                return false;
            }
            
            let ua_use = window.navigator.userAgent;
            let commandArgs = extraAppParamsArrGenerator('uget', url, ua_use, null, null, null, false);
            
            let p = Components.classes["@mozilla.org/process/util;1"]
                    .createInstance(Components.interfaces.nsIProcess);
            p.init(extraApp);
            p.run(false, commandArgs, commandArgs.length);
            
            return true;
//             dialog.mDialog.dialog = null;
//             window.close();
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
        if (UC_API)
            UC_API.Runtime.startupFinished().then(start);
        else
            start();

        async function start() {
            MDownloadPlus.init();
            window.MDownloadPlus = MDownloadPlus;
        }
    }
    
    function memoryAddUnit(memory) {
        let unit = "";
        let mem_united = "?";
        if (memory) {
            unit = "kB";
            mem_united = Math.ceil(memory / 1024);
            if (mem_united > 1024) {
                mem_united = Math.ceil((mem_united / 1024) * 10) / 10;
                unit = "MB";
                if (mem_united > 1024) {
                    mem_united = Math.ceil((mem_united / 1024) * 100) / 100;
                    unit = "GB";
                }
            }
            mem_united += unit;
        }
        return mem_united;
    }
    function convertToSuperscript(str) {  
        str = str.toString();
        const superscriptMap = {  
            '0': '⁰',  
            '1': '¹',  
            '2': '²',  
            '3': '³',  
            '4': '⁴',  
            '5': '⁵',  
            '6': '⁶',  
            '7': '⁷',  
            '8': '⁸',  
            '9': '⁹'  
        };  
        
        let result = '';  
        for (let char of str) {  
            if (superscriptMap.hasOwnProperty(char)) {  
                result += superscriptMap[char];  
            } else {  
                result += char;  
            }  
        }  
        
        return result;  
    }  
})();
