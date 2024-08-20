/*
 * @Author: chenwenda316
 * @Date: 2024-08-16 00:14:47
 * @LastEditTime: 2024-08-20 11:05:40
 * @FilePath: \my-electron-app\init.js
 */
console.log("init");

window.ifdelwav = 1;
window.ifsdir = 1;

document.getElementById("aboutbtn").click();


async function init_albums() {
    console.log("getting albums begin");
    await fetch('https://monster-siren.hypergryph.com/api/albums')
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
            window.albums = {};
            data.data.forEach(element => {
                window.albums[element.cid] = element;
            });
            // console.log(window.albums);
            console.log("getting albums processing");
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
    console.log("getting albums finished");
}

function init_songs() {
    console.log("getting songs");
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
            // console.log(data.data.list);
            window.songs = {};
            let tbody = "";
            data.data.list.forEach(element => {
                window.songs[parseInt(element.cid)] = element;

                let tr = `<tr>`;
                function insert_td(params) {
                    return "<td>" + params + "</td>";
                }
                tr += `<td id="song${parseInt(element.cid)}">${element.name}</td>`;
                tr += insert_td(window.albums[element.albumCid].name || element.albumCid);
                tr += `<td class="text-nowrap"><button type="button" class="btn btn-secondary btn-sm text-nowrap" onclick="info(${element.cid})">详情</button>
                    <button type="button" class="btn btn-primary btn-sm text-nowrap" onclick="downloadAlbum('${element.albumCid}')">下载专辑</button>
                    <button type="button" class="btn btn-primary btn-sm text-nowrap" onclick="download(${element.cid})">下载</button>
                    </td>`;
                tr += "</tr>";
                tbody += tr;
            });
            document.getElementById("target").innerHTML = tbody;
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

async function init_data() {
    await init_albums();
    init_songs();
}

setTimeout(() => {
    init_data();
}, 0);

