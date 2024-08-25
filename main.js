/*
 * @Author: chenwenda316
 * @Date: 2024-08-15 23:29:10
 * @LastEditTime: 2024-08-25 20:27:54
 * @FilePath: \my-electron-app\main.js
 */
// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const axios = require('axios');
const os = require('os');
const path = require('node:path')
const fs = require('fs');
const NodeID3 = require('node-id3')
const { exec } = require('child_process');
// var flac = require("flac-metadata2");




// 获取操作系统类型
const platform = os.platform();

let musicDirectory;

if (platform === 'win32') {
    // Windows系统
    musicDirectory = path.join(process.env.USERPROFILE, 'Music');
} else if (platform === 'darwin') {
    // macOS系统
    musicDirectory = path.join(process.env.HOME, 'Music');
} else if (platform === 'linux') {
    // Linux系统
    musicDirectory = path.join(process.env.HOME, 'Music');
} else {
    musicDirectory = __dirname;
}

musicDirectory = path.join(musicDirectory, "monster-siren");

fs.mkdir(musicDirectory, { recursive: true }, (err) => {
    if (err) throw err;
    console.log('sucessful mkdir.');
});

fs.mkdir(path.join(musicDirectory, "tmp"), { recursive: true }, (err) => {
    if (err) throw err;
    console.log('sucessful mkdir.');
});

let command;
if (os.platform() === 'win32') {
    command = `explorer ${musicDirectory}`;
} else if (os.platform() === 'darwin') {
    command = `open ${musicDirectory}`;
} else {
    command = `xdg-open ${musicDirectory}`;
}



var webContents;
var win;

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        // frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: true
    })

    win = mainWindow
    webContents = mainWindow.webContents;
    // 加载 index.html
    mainWindow.loadFile('index.html')
    // 打开开发工具
    // mainWindow.webContents.openDevTools()
}


async function download_song(e, value) {
    let d = value.d;
    let name = "";
    let artists = "";
    let url = "";
    let coverUrl = "";
    let albumCid = 0;
    let album = "";
    let ext = '';
    let pic_mime = "";
    let pic_buffer = "";
    let lrc = "";
    let lrcurl = "";
    let ifdelwav = value.o;
    let ifsdir = value.s;

    await axios.get("https://monster-siren.hypergryph.com/api/song/" + d)
        .then(response => {
            name = response.data.data.name;
            url = response.data.data.sourceUrl;
            lrcurl = response.data.data.lyricUrl;
            albumCid = response.data.data.albumCid;
            artists = response.data.data.artists;
        })
        .catch(error => {
            console.error('Error during HEAD request:', error);
        });


    await axios.get(`https://monster-siren.hypergryph.com/api/album/${albumCid}/data`)
        .then(response => {
            album = response.data.data.name;
            coverUrl = response.data.data.coverUrl;
        })
        .catch(error => {
            console.error('Error during HEAD request:', error);
        });


    const currentMusicDirectory = ifsdir ? path.join(musicDirectory, album) : musicDirectory;

    fs.mkdir(currentMusicDirectory, { recursive: true }, (err) => {
        if (err) throw err;
        console.log('sucessful mkdir.');
    });


    await axios.get(lrcurl)
        .then(response => {
            lrc = response.data;
            fs.writeFile(path.join(currentMusicDirectory, `[${album}] ${name}.lrc`), lrc, (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                } else {
                    console.log('File saved successfully');
                }
            });

        })
        .catch(error => {
            console.error('Error during HEAD request:', error);
        });

    await axios.get(coverUrl, {
        responseType: 'arraybuffer',
    })
        .then(response => {
            const data = Buffer.from(response.data);
            pic_buffer = data;
            pic_mime = response.headers['content-type'];
            const regex = /\/(\w+)$/;
            ext = response.headers['content-type'].match(regex)[1];
            fs.writeFile(path.join(musicDirectory, "tmp", `${albumCid}.${ext}`), data, (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                } else {
                    console.log('File saved successfully');
                }
            });
        })
        .catch(error => {
            console.error('Error during HEAD request:', error);
        });


    let mutiDownloadArgs = {
        url,
        chunkSize: 1024 * 128,
        chunks: 16,
        fileSize: 0,
        receivedSize: 0,
        lastReceivedSize: 0,
        receivedChunks: [],
        working: 0,
        rate: 0,
        contentType: ""
    }

    function downloadProgressHolder(e) {
        mutiDownloadArgs.receivedSize += e.bytes;
        win.setProgressBar(mutiDownloadArgs.receivedSize / mutiDownloadArgs.fileSize);
        webContents.send("progress", { rate: mutiDownloadArgs.rate, loaded: mutiDownloadArgs.receivedSize, total: mutiDownloadArgs.fileSize });
        // console.log(mutiDownloadArgs.receivedSize, mutiDownloadArgs.fileSize);
    }

    function updateRate() {
        mutiDownloadArgs.rate = (mutiDownloadArgs.receivedSize - mutiDownloadArgs.lastReceivedSize) * 10;
        mutiDownloadArgs.lastReceivedSize = mutiDownloadArgs.receivedSize;
    }

    let updaterate = setInterval(updateRate, 100);

    function downloadChunkHolder() {
        if (mutiDownloadArgs.receivedSize == mutiDownloadArgs.fileSize) {
            console.log("download music data ok.");
            const data = Buffer.concat(mutiDownloadArgs.receivedChunks);
            if (mutiDownloadArgs.contentType == "audio/mpeg") {
                const tags = {
                    title: name,
                    artist: artists.join(" "),
                    album: album,
                    APIC: {
                        mime: pic_mime,
                        type: {
                            id: 3
                        }, // See https://en.wikipedia.org/wiki/ID3#ID3v2_embedded_image_extension
                        imageBuffer: pic_buffer
                    },
                    unsynchronisedLyrics: {
                        language: "eng",
                        text: lrc
                    }
                    //   path.join(musicDirectory, "tmp", `${albumCid}.${ext}`),
                }
                const success = NodeID3.update(tags, data)

                fs.writeFile(path.join(currentMusicDirectory, `[${album}] ${name.replace(/:/g,"：")}.mp3`), success, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                    } else {
                        console.log('File saved successfully');
                        webContents.send("oksong", { id: d });
                    }
                });

            } else if (mutiDownloadArgs.contentType == "audio/wav") {
                fs.writeFile(path.join(currentMusicDirectory, `[${album}] ${name}.wav`), data, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                    } else {
                        console.log('File saved successfully', path.join(currentMusicDirectory, `[${album}] ${name}.wav`));

                        // let ffcommand = `ffmpeg -y -i "${path.join(currentMusicDirectory, `[${album}] ${name}.wav`)}"  "${path.join(currentMusicDirectory, `[${album}] ${name}.no_cover.flac`)}"`;
                        let ffcommand = `ffmpeg -y -i "${path.join(currentMusicDirectory, `[${album}] ${name}.wav`)}" -metadata title="${name}" -metadata artist="${artists.join(" ")}" -metadata album="${album}"  "${path.join(currentMusicDirectory, `[${album}] ${name}.no_cover.flac`)}"`;
                        exec(ffcommand, (error, stdout, stderr) => {
                            if (error) {
                                console.log('save flac error');
                                console.log(stderr);
                            } else {

                                //use flac-metadata2
                                if (0) {
                                    var reader = fs.createReadStream(path.join(currentMusicDirectory, `[${album}] ${name}.no_cover.flac`));
                                    var writer = fs.createWriteStream(path.join(currentMusicDirectory, `[${album}] ${name}.flac`));
                                    var processor = new flac.Processor();

                                    processor.on("preprocess", function (mdb) {
                                        if (mdb.type === flac.Processor.MDB_TYPE_PICTURE) {
                                            mdb.remove();
                                        }
                                        if (mdb.removed || mdb.isLast) {
                                            //
                                            var mdbVorbis2 = flac.data.MetaDataBlockPicture.create(mdb.isLast, 3, pic_mime, "", "", "", "", "", pic_buffer);
                                            this.push(mdbVorbis2.publish());
                                        }
                                    });
                                    reader.pipe(processor).pipe(writer);

                                }


                                //use ffmpeg

                                console.log('save flac success');
                                let convertCommand = `ffmpeg -y -i "${path.join(currentMusicDirectory, `[${album}] ${name}.no_cover.flac`)}" -i "${path.join(musicDirectory, "tmp", `${albumCid}.${ext}`)}" -map 0:a -map 1:v -c:v copy -disposition:v attached_pic -codec:a copy "${path.join(currentMusicDirectory, `[${album}] ${name}.flac`)}"`
                                exec(convertCommand, (error, stdout, stderr) => {
                                    if (error) { } else {
                                        console.log('convert flac success');
                                        fs.unlink(path.join(currentMusicDirectory, `[${album}] ${name}.no_cover.flac`), (err) => {
                                            if (err) {
                                                console.error('删除文件时出错:', err);
                                            } else {
                                                console.log('文件删除成功');
                                                webContents.send("oksong", { id: d });
                                            }
                                        });
                                        if (ifdelwav) {
                                            fs.unlink(path.join(currentMusicDirectory, `[${album}] ${name}.wav`), (err) => {
                                                if (err) {
                                                    console.error('删除文件时出错:', err);
                                                } else {
                                                    console.log('文件删除成功');
                                                }
                                            });
                                        }
                                    }

                                })
                            }
                        });
                    }
                });


            }

            clearInterval(updaterate);
            win.setProgressBar(-114514);
        }
    }

    axios.head(url)
        .then(response => {
            mutiDownloadArgs.fileSize = parseInt(response.headers['content-length'], 10);
            mutiDownloadArgs.contentType = response.headers['content-type'];
            console.log('Content-Length:', mutiDownloadArgs.fileSize);
            // mutiDownloadArgs.chunkSize = Math.ceil(mutiDownloadArgs.fileSize / mutiDownloadArgs.chunks)
            mutiDownloadArgs.chunks = Math.ceil(mutiDownloadArgs.fileSize / mutiDownloadArgs.chunkSize);
            mutiDownloadArgs.receivedChunks = new Array(mutiDownloadArgs.chunks)
            console.log(mutiDownloadArgs.chunks);
            let i = 0;
            function createSingle() {
                mutiDownloadArgs.working++;
                const start = i * mutiDownloadArgs.chunkSize;
                const end = i == mutiDownloadArgs.chunks - 1 ? mutiDownloadArgs.fileSize - 1 : start + mutiDownloadArgs.chunkSize - 1;
                let k = i;
                axios.get(url,
                    {
                        onDownloadProgress: (progressEvent) => {
                            downloadProgressHolder(progressEvent);
                        },
                        responseType: 'arraybuffer',
                        headers: {
                            'Range': `bytes=${start}-${(i==mutiDownloadArgs.chunks - 1?'':end)}`
                        }
                    }
                ).then(response => {
                    const data = response.data;
                    mutiDownloadArgs.receivedChunks[k] = data;
                    mutiDownloadArgs.working--;
                    downloadChunkHolder();
                }).catch(error => {
                    console.error('下载部分时出错:', error);
                });
                i++;
            }
            function choke() {
                if (mutiDownloadArgs.working < 4) {
                    createSingle();
                } else {
                    setTimeout(createSingle, 5);
                }
            }
            for (let j = 0; j < mutiDownloadArgs.chunks; j++) {
                setTimeout(createSingle, j * 5);
            }
        })
        .catch(error => {
            console.error('Error during HEAD request:', error);
        });


    return;


    await axios.get(url,
        {
            onDownloadProgress: (progressEvent) => {
                webContents.send("progress", progressEvent);
                win.setProgressBar(progressEvent.loaded / progressEvent.total);
            },
            responseType: 'arraybuffer'
        }
    )
        .then(response => {
            const data = Buffer.from(response.data);
            if (response.headers['content-type'] == "audio/mpeg") {
                const tags = {
                    title: name,
                    artist: artists.join(" "),
                    album: album,
                    APIC: {
                        mime: pic_mime,
                        type: {
                            id: 3
                        }, // See https://en.wikipedia.org/wiki/ID3#ID3v2_embedded_image_extension
                        imageBuffer: pic_buffer
                    },
                    unsynchronisedLyrics: {
                        language: "eng",
                        text: lrc
                    }
                    //   path.join(musicDirectory, "tmp", `${albumCid}.${ext}`),
                }
                const success = NodeID3.update(tags, data)

                fs.writeFile(path.join(musicDirectory, `[${album}] ${name}.mp3`), success, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                    } else {
                        console.log('File saved successfully');
                    }
                });

            } else if (response.headers['content-type'] == "audio/wav") {
                fs.writeFile(path.join(musicDirectory, `[${album}] ${name}.wav`), data, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                    } else {
                        console.log('File saved successfully', path.join(musicDirectory, `[${album}] ${name}.wav`));

                        let ffcommand = `ffmpeg -i "${path.join(musicDirectory, `[${album}] ${name}.wav`)}" -metadata title="${name}" -metadata artist="${artists.join(" ")}" -metadata album="${album}"  "${path.join(musicDirectory, `[${album}] ${name}.no_cover.flac`)}"`;
                        exec(ffcommand, (error, stdout, stderr) => {
                            if (error) {
                                console.log('save flac error');
                                console.log(stderr);
                            } else {
                                console.log('save flac success');
                                let convertCommand = `ffmpeg -i "${path.join(musicDirectory, `[${album}] ${name}.no_cover.flac`)}" -i "${path.join(musicDirectory, "tmp", `${albumCid}.${ext}`)}" -map 0:a -map 1:v -c:v copy -disposition:v attached_pic -codec:a copy "${path.join(musicDirectory, `[${album}] ${name}.flac`)}"`
                                exec(convertCommand, (error, stdout, stderr) => {
                                    if (error) { } else {
                                        console.log('convert flac success');
                                        fs.unlink(path.join(musicDirectory, `[${album}] ${name}.no_cover.flac`), (err) => {
                                            if (err) {
                                                console.error('删除文件时出错:', err);
                                            } else {
                                                console.log('文件删除成功');
                                            }
                                        });
                                    }

                                })
                            }
                        });
                        // -cover_art "${path.join(musicDirectory, "tmp", `${albumCid}.${ext}`)}
                    }
                });


            }
        })
        .catch(error => {
            console.error('Error during HEAD request:', error);
        });

    win.setProgressBar(-114514);
}

function openfolder() {
    exec(command)
}

// 这段程序将会在 Electron 结束初始化
// 和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用。

app.whenReady().then(() => {
    ipcMain.on('download-song', download_song)
    ipcMain.on('openfolder', openfolder)
    createWindow()
    Menu.setApplicationMenu(Menu.buildFromTemplate([]));

    app.on('activate', () => {
        // 在 macOS 系统内, 如果没有已开启的应用窗口
        // 点击托盘图标时通常会重新创建一个新窗口
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序。 因此, 通常
// 对应用程序和它们的菜单栏来说应该时刻保持激活状态, 
// 直到用户使用 Cmd + Q 明确退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
})

// 在当前文件中你可以引入所有的主进程代码
// 也可以拆分成几个文件，然后用 require 导入。