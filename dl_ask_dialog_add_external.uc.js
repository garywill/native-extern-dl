/* Open external downloader directly from Firefox native download asking dialog
 * Add a button to call system command
 * 
 * Show automatically-started download progress
 * 
 * By garywill (https://garywill.github.io)
 * Tested on Firefox 153
 * 
 */

// ==UserScript==
// @include     chrome://mozapps/content/downloads/unknownContentType.xhtml
// ==/UserScript==


"use strict";

console.log("dl_ask_dialog_add_external.uc.js");
    
(() => {
    // NOTE Define you custom external downloaders here
    const UserExternalDlers = [
        {
            dlerName: "uget",
            dlerDisplayName: "uGet", // External downloader display name
            binPath: "/usr/bin/uget-gtk",  // AbsPath to external downloader executable file
        },

        // NOTE Below are tests
        // {
        //     dlerName: "kdialog",
        //     dlerDisplayName: "TestWKdialog",
        //     binPath: "/usr/bin/kdialog",
        // },
        // {
        //     dlerName: "test_no",
        //     dlerDisplayName: "TestNo",
        //     binPath: "echo", // use a existing command but not abs path. Should throw error
        // },

    ];

    function gen_external_dler_args(app, dlurl, useragent, referer, cookie, postdata, proxy) {
        // dlurl useragent  referer  cookie  postdata : string
        // proxy : bool
        let result_arr = [];

        if (app == 'uget' || app == 'kdialog')
        {
            if (useragent)
                result_arr = result_arr.concat([`--http-user-agent=${useragent}`]);

            if (referer)
                result_arr = result_arr.concat([`--http-referer=${referer}`]);

            // aria2c不支持cookie ?
            // 只支持 --http-cookie-file 而data无效？
            if (cookie)
                result_arr = result_arr.concat([`--http-cookie-data=${cookie}`]);

            if (proxy)
            {
                const proxy_type = 2; // 2 : uget http proxy
                const proxy_ip = '127.0.0.1';
                const proxy_port = 7990;
                result_arr = result_arr.concat([
                    `--proxy-type=${proxy_type}`,
                    `--proxy-host=${proxy_ip}`,
                    `--proxy-port=${proxy_port}`

                ]);
            }

            // aria2c不支持postdata ?
            // 只支持 --http-post-file 而data无效？
            if (postdata)
                result_arr = result_arr.concat([`--http-post-data=${postdata}`]);

            result_arr = result_arr.concat([dlurl]);
        }
        else
        {
            let errmsg = `Unknown app '${app}'`;
            // console.error(errmsg);
            throw new Error(errmsg);
        }

        if (app == 'kdialog')
            result_arr = ['--msgbox', 'ADDITIONAL_CHARS_TEST_1234abcd中文`~!@#$%^&*()_+=-";:,./<>?|[]{} ' + result_arr.toString() ];

        return result_arr;
    }

    // ===============================================================


    const url = dialog.mLauncher.source.spec;
    const networkFile_size = dialog.mLauncher.contentLength;
    const dialogElement = document.getElementById('unknownContentType');

    if (location.href.startsWith("chrome://mozapps/content/downloads/unknownContentType.x")) {
        if (UC_API)
            UC_API.Runtime.startupFinished().then(main);
        else
            main();
    }

    function main()
    {

        enhanceUrlDisplay();

        if (is_url_valid(url))
        {
            showAutoDlInfo(dialogElement);

            createExternalDlBtns(dialogElement);
        }
    }

    function is_url_valid(url)
    {
        let url2 = url.toLowerCase()
        if (   url2.startsWith('http://')
            || url2.startsWith('https://')
            || url2.startsWith('ws://')
            || url2.startsWith('wss://')
            || url2.startsWith('ftp://')
            || url2.startsWith('ftps://')
            || url2.startsWith('sftp://')
        ) {
            return true;
        }
        return false;
    }

    function createExternalDlBtns(pElement) {
        for (let dlerConfig of UserExternalDlers )
        {
            let btn = document.createXULElement('button');

            btn.setAttribute("label", dlerConfig.dlerDisplayName);
            btn.setAttribute("downloaderName", dlerConfig.dlerName);

            btn.addEventListener("command", function() {
                try {
                    if ( runSystemExternalDler(dlerConfig) === true)
                    {
                        pElement.getButton("cancel").click();
                        // dialog.mDialog.dialog = null;
                        // window.close();
                    }
                }catch(err) {
                    alert("Something was wrong when tring to launch external doenload app:\n" + err.message);
                    console.error(err.message);
                    console.error(err.toString());
                    console.error(err.stack);
                }
            });
            pElement.appendChild(btn);
        }

    }

    function runSystemExternalDler (config) {
        // console.log(config)
        const nsIFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);

        nsIFile.initWithPath(config.binPath);
        if (!nsIFile.exists()) {
            let errmsg = `Can not find bin ${config.binPath}`;
            // console.error(errmsg)
            throw new Error(errmsg)
        }

        let ua_use = window.navigator.userAgent;
        let commandArgs = gen_external_dler_args(config.dlerName, url, ua_use, null, null, null, false);
        // console.log(commandArgs)

        let proc_util = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
        proc_util.init(nsIFile);
        proc_util.run(false, commandArgs, commandArgs.length);

        return true;
    }




    function showAutoDlInfo(pElement) {
        let hbox = document.createXULElement("div");
        hbox.style.display = "grid";

        let tmpFilePathBox = document.createElement("input");
        tmpFilePathBox.readOnly = true;
        tmpFilePathBox.style.background = "none";
        tmpFilePathBox.style.borderWidth = 0;
        tmpFilePathBox.style.outline = 0;
        tmpFilePathBox.style.margin = 0;
        tmpFilePathBox.style.padding = 0;
        tmpFilePathBox.style.whiteSpace = "nowrap";
        tmpFilePathBox.style.fontSize = "7px";

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
        hbox.appendChild(tmpFilePathBox);
        hbox.appendChild(info);

        window.setInterval(function() {
            var tmpFile = dialog.mLauncher.targetFile;

            var tmpFilePath = tmpFile.path ? tmpFile.path : tmpFile.persistentDescriptor;
            var downloaded_size = tmpFile.fileSize !== undefined ? tmpFile.fileSize : tmpFile.fileSizeOfLink;
            var space_avai = tmpFile.diskSpaceAvailable;


            tmpFilePathBox.value = tmpFilePath;

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

        pElement.appendChild(hbox);
    }

    function enhanceUrlDisplay() {
        var element = document.querySelector("#source");
        window.setInterval( function() {
            element.setAttribute("tooltiptext",
                                 dialog.mLauncher.source.spec + '\n'
                                 + '(Double click to copy URL)'
            );
            element.style.textDecoration = 'underline';
            element.style.cursor = 'pointer';
        }, 500);
        element.addEventListener("dblclick", function() {
            Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper).copyString(dialog.mLauncher.source.spec) ;
        });
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
        // 创建一个映射表，将ASCII数字字符映射到上标字符（这里直接使用字符）  
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


