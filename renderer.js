/*
 * @Author: chenwenda316
 * @Date: 2024-08-15 23:43:23
 * @LastEditTime: 2024-08-25 20:26:38
 * @FilePath: \my-electron-app\renderer.js
 */
console.log("hello!");


window.electronAPI.onUpdateCounter((value) => {
    // console.log(value);
    let loaded = (value.loaded / 1024 / 1024).toFixed(2);
    let total = (value.total / 1024 / 1024).toFixed(2);
    let precent = (loaded / total * 100).toFixed(0);
    let rate = (value.rate / 1024 / 1024).toFixed(2);
    document.getElementById("dl1").width.baseVal.value = loaded / total * 1600;
    document.getElementById("d_status").innerText = (loaded == total ? "已完成" : "下载中");
    document.getElementById("d_info").innerText = `(${precent}%) [${loaded}/${total}MB][${rate}MB/s]`
    if (loaded == total) {
        window.isdownloading = false;
        downloadNext()
    }
})

window.electronAPI.oksong((value) => {
    // console.log("ok");
    // console.log(value, document.getElementById(`song${value.id}`));

    document.getElementById(`song${value.id}`).classList.remove('bg-warning-subtle');
    document.getElementById(`song${value.id}`).classList.add('bg-success-subtle');
})

window.electronAPI.damnsong((value) => {
    //I find that it is very hard to figure out how to resume from
    //a network error, the following code is untest, so I dorp them
    //and I use downloaded list to help user to due with wetwork error.
    return;
    console.log("damn");
    // console.log(value, document.getElementById(`song${value.id}`));
    if (parseInt(window.downloadList[window.currentDownload].cid==value.id)){
        window.currentDownload--;
        window.isdownloading = false;
        downloadNext()
    }
})

function download(id) {
    if (window.isdownloading) {
        document.getElementById("d_warn").click();
        return;
    }

    window.isdownloading = true;
    // console.log(id);
    document.getElementById("d_song").innerText = `<${window.songs[id].name}>`;
    document.getElementById(`song${id}`).classList.add('bg-warning-subtle');
    document.getElementById("dl1").width = 0;
    window.electronAPI.download_song({ d: id, o: window.ifdelwav, s: window.ifsdir });

}



function downloadAlbum(acid) {
    if (window.isdownloading) {
        document.getElementById("d_warn").click();
        return;
    }
    fetch(`https://monster-siren.hypergryph.com/api/album/${acid}/detail`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            return JSON.parse(data).data;
        }).then(data => {
            // console.log(data);
            window.downloadList = data.songs;
            window.currentDownload = 0;
            downloadNext();
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });


}


function downloadNext() {
    if (!window.downloadList.length || window.currentDownload == window.downloadList.length) {
        return;
    }
    download(parseInt(window.downloadList[window.currentDownload].cid));
    window.currentDownload++;
}


function downloadAll(n) {

    if (window.isdownloading) {
        document.getElementById("d_warn").click();
        return;
    }
    fetch('https://monster-siren.hypergryph.com/api/songs')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            return JSON.parse(data);
        })
        .then(data => {
            window.downloadList = data.data.list.slice(n);
            window.currentDownload = 0;
            downloadNext();
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

function cancelDownload() {
    window.downloadList = [];
    window.currentDownload = 0;
}


function info(id) {
    document.getElementById("showinfo").click();
    fetch(`https://monster-siren.hypergryph.com/api/album/${window.songs[id].albumCid}/data`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            return JSON.parse(data).data;
        })
        .then(data => {
            document.getElementById("info_pic").src = data.coverDeUrl || data.coverUrl;
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });

    fetch(`https://monster-siren.hypergryph.com/api/song/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            return JSON.parse(data).data;
        })
        .then(data => {
            document.getElementById("info_src").innerHTML = `<input type="text" class="form-control" value="${data.sourceUrl || ""}" placeholder="不可能没有啊" readonly>`;
            document.getElementById("info_name").innerText = data.name;
            document.getElementById("info_lrc").innerHTML = `<input type="text" class="form-control" value="${data.lyricUrl || ""}" placeholder="无歌词" readonly>`;
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

function openfolder() {
    window.electronAPI.openfolder();
}

function selectfolder() {
    window.electronAPI.selectfolder();
}
let currentIndex = -1;
let findParagraphs = []; // 存储所有匹配项的索引

function searchWithEnter(event) {
    if (event.key === 'Enter') {
        if (!findParagraphs.length) {
            const searchText = document.getElementById('searchBox').value.toLowerCase();
            const paragraphs = document.querySelectorAll('td');
            paragraphs.forEach((paragraph, index) => {
                if (paragraph.textContent.toLowerCase().includes(searchText)) {
                    findParagraphs.push(paragraph);
                    // paragraph.classList.add('highlight');
                }
            });
        }
        if (findParagraphs.length) {
            if (currentIndex != -1) findParagraphs[currentIndex].classList.remove('bg-warning');
            currentIndex++;
            currentIndex %= findParagraphs.length;
            // findParagraphs[currentIndex].scrollIntoView({ behavior: 'smooth' })
            window.scrollTo({
                top: findParagraphs[currentIndex].offsetTop,
                behavior: 'smooth' // 平滑滚动
              });
            findParagraphs[currentIndex].classList.add('bg-warning');
        }

    } else if (event.key === "Escape") { } else {
        clearFind()
    }
}

function clearFind() {
    if (findParagraphs.length) findParagraphs[currentIndex].classList.remove('bg-warning');
    findParagraphs = [];
    currentIndex = -1;
}

// 清除高亮的快捷键（例如：Esc键）
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        clearFind()
    }
});

function changecheckwav() {
    window.ifdelwav = document.getElementById("checkwav").checked;
}
function changecheckdir() {
    window.ifsdir = document.getElementById("checkdir").checked;
}

